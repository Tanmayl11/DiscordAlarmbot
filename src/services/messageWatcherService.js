const { DateTime } = require("luxon");
const scheduleService = require("./scheduleService");

// FoeHelper format: **LABEL** <t:unix:?> (with optional second timestamp tag)
// :robot: anywhere in message = append @Dragon to alert label
const BOLD_ENTRY_REGEX = /\*\*(.+?)\*\*\s*<t:(\d+):[tTdDfFR]>/g;

class MessageWatcherService {
  constructor() {
    // Map of guildId -> array of { watchedUserId, alertChannelId, addedBy }
    this.watchConfigs = new Map();
  }

  addWatchConfig(guildId, config) {
    if (!this.watchConfigs.has(guildId)) {
      this.watchConfigs.set(guildId, []);
    }
    const configs = this.watchConfigs.get(guildId);
    const exists = configs.some(
      (c) =>
        c.watchedUserId === config.watchedUserId &&
        c.alertChannelId === config.alertChannelId
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
    const tagDragon = content.includes(":robot:");
    const results = [];
    const now = DateTime.now();
    for (const match of content.matchAll(BOLD_ENTRY_REGEX)) {
      const label = match[1].trim();
      const eventTime = DateTime.fromSeconds(parseInt(match[2], 10));
      if (eventTime > now) {
        results.push({ label, eventTime, tagDragon });
      }
    }
    return results;
  }

  async handleMessage(message, client) {
    if (!message.guild) return;
    if (message.author.bot && !message.webhookId) return;

    const guildId = message.guild.id;
    const configs = this.watchConfigs.get(guildId);
    if (!configs || configs.length === 0) return;

    const matchingConfigs = configs.filter(
      (c) =>
        (message.webhookId && c.watchedUserId === message.webhookId) ||
        c.watchedUserId === message.author.id
    );
    if (matchingConfigs.length === 0) return;

    const content = message.content ?? "";
    const events = this.parseFoeHelperMessage(content);
    if (events.length === 0) return;

    for (const { label, eventTime, tagDragon } of events) {
      const alarmTime = eventTime.minus({ minutes: 1 });
      const msUntilAlarm = alarmTime.toMillis() - Date.now();
      const eventUnix = Math.floor(eventTime.toSeconds());
      const displayLabel = tagDragon ? `${label} @everyone` : label;
      const alertText = `⏰ **1 minute warning!** ${displayLabel} — <t:${eventUnix}:t> (<t:${eventUnix}:R>)`;

      // Use a unique ID derived from the event unix time + label so duplicate
      // messages for the same event don't create duplicate alarms
      const alarmId = `watcher_${guildId}_${label}_${eventUnix}`;

      // Skip if already scheduled (e.g. FoeHelper resent the same event)
      if (scheduleService.scheduledJobs.has(alarmId)) {
        console.log(`[MessageWatcher] Already scheduled, skipping: ${alarmId}`);
        continue;
      }

      console.log(
        `[MessageWatcher] guild=${guildId} label="${displayLabel}" ` +
        `event=<t:${eventUnix}:R> alarmIn=${Math.round(msUntilAlarm / 1000)}s`
      );

      for (const config of matchingConfigs) {
        const alertChannelId = config.alertChannelId;

        if (msUntilAlarm <= 0) {
          try {
            const ch = await client.channels.fetch(alertChannelId);
            if (ch) await ch.send(`⏰ **Now!** ${displayLabel} — <t:${eventUnix}:t>`);
          } catch (err) {
            console.error(`[MessageWatcher] Immediate alert error:`, err);
          }
          continue;
        }

        // Wrap setTimeout in a job-shaped object so scheduleService can stop it
        const timeoutId = setTimeout(async () => {
          scheduleService.scheduledJobs.delete(alarmId);
          try {
            const ch = await client.channels.fetch(alertChannelId);
            if (ch) await ch.send(alertText);
          } catch (err) {
            console.error(`[MessageWatcher] Delayed alert error:`, err);
          }
        }, msUntilAlarm);

        const fakeJob = { stop: () => clearTimeout(timeoutId) };

        // Register directly into scheduleService so cancel / list / cancel-all all work
        scheduleService.scheduledJobs.set(alarmId, {
          job: fakeJob,
          details: {
            createdBy: message.author.id,
            timezone: "UTC",
            time: alarmTime.setZone("UTC").toFormat("HH:mm"),
            message: alertText,
            dayNumber: "*",
            channelId: alertChannelId,
            guildId,
            createdAt: DateTime.now().toUTC().toISO(),
            executionTime: alarmTime.toUTC().toISO(),
          },
        });
      }
    }
  }
}

module.exports = new MessageWatcherService();