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

  async _scheduleEvent(event, matchingConfigs, rolePing, guildId, message, client) {
    const { label, eventTime } = event;
    const alarmTime = eventTime.minus({ minutes: 1 });
    const msUntilAlarm = alarmTime.toMillis() - Date.now();
    const eventUnix = Math.floor(eventTime.toSeconds());

    // Full alert text including role ping on its own line if present
    const bodyText = "⏰ **" + label + "** — 1 minute! <t:" + eventUnix + ":t> (<t:" + eventUnix + ":R>)";
    const alertText = rolePing ? rolePing + "\n" + bodyText : bodyText;

    // Stable ID prevents duplicate alarms for the same event
    const alarmId = "watcher_" + guildId + "_" + label + "_" + eventUnix;

    if (scheduleService.scheduledJobs.has(alarmId)) {
      console.log("[MessageWatcher] Already scheduled, skipping: " + alarmId);
      return;
    }

    console.log(
      "[MessageWatcher] guild=" + guildId + " label=\"" + label + "\"" +
      " event=<t:" + eventUnix + ":R> alarmIn=" + Math.round(msUntilAlarm / 1000) + "s"
    );

    for (const config of matchingConfigs) {
      const alertChannel = await client.channels.fetch(config.alertChannelId).catch(() => null);
      if (!alertChannel) continue;

      if (msUntilAlarm <= 0) {
        await alertChannel.send(alertText).catch((err) =>
          console.error("[MessageWatcher] Immediate alert error:", err)
        );
        continue;
      }

      // Build a fake interaction so scheduleService.scheduleMessage handles everything
      const fakeInteraction = {
        id: alarmId,
        user:    { id: message.author.id },
        channel: alertChannel,
        guild:   message.guild,
      };

      const alarmTimeUTC = alarmTime.setZone("UTC");

      await scheduleService.scheduleMessage(
        fakeInteraction,
        "UTC",
        alarmTimeUTC.toFormat("HH:mm"),
        alertText,
        "*",       // one-time
        alarmId    // idOverride — keeps the stable watcher ID
      );
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