const { DateTime } = require("luxon");
const scheduleService = require("./scheduleService");
const watcherConfigService = require("./watcherConfigService");

const BOLD_ENTRY_REGEX = /\*\*(.+?)\*\*\s*<t:(\d+):[tTdDfFR]>/g;

class MessageWatcherService {
  constructor() {
    this.watchConfigs = new Map();
  }

  addWatchConfig(guildId, config) {
    if (!this.watchConfigs.has(guildId)) this.watchConfigs.set(guildId, []);
    const configs = this.watchConfigs.get(guildId);
    const exists = configs.some(
      (c) => c.watchedUserId === config.watchedUserId && c.alertChannelId === config.alertChannelId
    );
    if (exists) return { success: false, reason: "duplicate" };
    configs.push(config);
    return { success: true };
  }

  removeWatchConfig(guildId, watchedUserId, alertChannelId) {
    const configs = this.watchConfigs.get(guildId);
    if (!configs) return false;
    const filtered = configs.filter(
      (c) => !(c.watchedUserId === watchedUserId && c.alertChannelId === alertChannelId)
    );
    this.watchConfigs.set(guildId, filtered);
    return filtered.length < configs.length;
  }

  getWatchConfigs(guildId) {
    return this.watchConfigs.get(guildId) || [];
  }

  parseFoeHelperMessage(content) {
    const now = DateTime.now();
    return [...content.matchAll(BOLD_ENTRY_REGEX)]
      .map((match) => ({
        label: match[1].trim(),
        eventTime: DateTime.fromSeconds(Number.parseInt(match[2], 10)),
      }))
      .filter((e) => e.eventTime > now);
  }

  _getMatchingConfigs(message) {
    const configs = this.watchConfigs.get(message.guild.id) ?? [];
    return configs.filter(
      (c) =>
        (message.webhookId && c.watchedUserId === message.webhookId) ||
        c.watchedUserId === message.author.id
    );
  }

  // Sends with role mentions in `content` so Discord actually pings them,
  // and the label/time in the message body.
  async _sendAlert(channelId, rolePing, text, client) {
    const ch = await client.channels.fetch(channelId);
    if (!ch) return;
    // Put role pings in content so they fire, text is the readable body
    const payload = rolePing
      ? { content: rolePing + "\n" + text }
      : { content: text };
    await ch.send(payload);
  }

  _registerAlarm(alarmId, options, client) {
    const { alertChannelId, rolePing, alertText, alarmTime, message, guildId } = options;
    const timeoutId = setTimeout(async () => {
      scheduleService.scheduledJobs.delete(alarmId);
      try {
        await this._sendAlert(alertChannelId, rolePing, alertText, client);
      } catch (err) {
        console.error("[MessageWatcher] Delayed alert error:", err);
      }
    }, alarmTime.toMillis() - Date.now());

    scheduleService.scheduledJobs.set(alarmId, {
      job: { stop: () => clearTimeout(timeoutId) },
      details: {
        createdBy: message.author.id,
        timezone: "UTC",
        time: alarmTime.setZone("UTC").toFormat("HH:mm"),
        message: (rolePing ? rolePing + " " : "") + alertText,
        dayNumber: "*",
        channelId: alertChannelId,
        guildId,
        createdAt: DateTime.now().toUTC().toISO(),
        executionTime: alarmTime.toUTC().toISO(),
      },
    });
  }

  async _scheduleEvent(event, matchingConfigs, rolePing, guildId, message, client) {
    const { label, eventTime } = event;
    const alarmTime = eventTime.minus({ minutes: 1 });
    const msUntilAlarm = alarmTime.toMillis() - Date.now();
    const eventUnix = Math.floor(eventTime.toSeconds());
    const alertText = "⏰ **" + label + "** — 1 minute warning! <t:" + eventUnix + ":t> (<t:" + eventUnix + ":R>)";
    const alarmId = "watcher_" + guildId + "_" + label + "_" + eventUnix;

    if (scheduleService.scheduledJobs.has(alarmId)) {
      console.log("[MessageWatcher] Already scheduled, skipping: " + alarmId);
      return;
    }

    console.log("[MessageWatcher] guild=" + guildId + " label=\"" + label + "\" event=<t:" + eventUnix + ":R> alarmIn=" + Math.round(msUntilAlarm / 1000) + "s");

    for (const config of matchingConfigs) {
      if (msUntilAlarm <= 0) {
        try {
          await this._sendAlert(config.alertChannelId, rolePing, "⏰ **" + label + "** — Now! <t:" + eventUnix + ":t>", client);
        } catch (err) {
          console.error("[MessageWatcher] Immediate alert error:", err);
        }
      } else {
        this._registerAlarm(alarmId, { alertChannelId: config.alertChannelId, rolePing, alertText, alarmTime, message, guildId }, client);
      }
    }
  }

  async handleMessage(message, client) {
    if (!message.guild) return;
    if (message.author.bot && !message.webhookId) return;

    const matchingConfigs = this._getMatchingConfigs(message);
    if (matchingConfigs.length === 0) return;

    const content = message.content ?? "";
    const events = this.parseFoeHelperMessage(content);
    if (events.length === 0) return;

    const rolePing = watcherConfigService.resolvePings(message.guild.id, content);

    for (const event of events) {
      await this._scheduleEvent(event, matchingConfigs, rolePing, message.guild.id, message, client);
    }
  }
}

module.exports = new MessageWatcherService();