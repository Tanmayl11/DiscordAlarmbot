const cron = require("node-cron");
const { DateTime, IANAZone } = require("luxon");
const { mapToCronDay } = require("../utils/timeUtils");

class ScheduleService {
  constructor() {
    this.scheduledJobs = new Map();
  }

  async scheduleMessage(interaction, timezone, time, scheduledMessage, dayNumber = "*", idOverride = null) {
    if (!IANAZone.isValidZone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    if (dayNumber !== "*" && (isNaN(parseInt(dayNumber)) || parseInt(dayNumber) < 0 || parseInt(dayNumber) > 6)) {
      throw new Error(`Invalid dayNumber: ${dayNumber}`);
    }

    const [hours, minutes] = time.split(":");
    const cronDay = mapToCronDay(dayNumber);
    const cronExpression = `${minutes} ${hours} * * ${cronDay}`;
    const alarmId = idOverride ?? interaction.id;

    let executionTime = null;
    if (dayNumber === "*") {
      const now = DateTime.now();
      executionTime = now
        .setZone(timezone)
        .set({ hour: parseInt(hours), minute: parseInt(minutes), second: 0 });

      if (executionTime < DateTime.now().setZone(timezone)) {
        executionTime = executionTime.plus({ days: 1 });
      }
    }

    const job = cron.schedule(
      cronExpression,
      async () => {
        try {
          await interaction.channel.send(scheduledMessage);
          if (dayNumber === "*") {
            this.scheduledJobs.delete(alarmId);
            job.stop();
          }
        } catch (error) {
          console.error(`Error sending scheduled message id=${alarmId}:`, error);
        }
      },
      { timezone }
    );

    this.scheduledJobs.set(alarmId, {
      job,
      details: {
        createdBy: interaction.user.id,
        timezone,
        time,
        message: scheduledMessage,
        dayNumber,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id,
        createdAt: DateTime.now().setZone(timezone).toISO(),
        executionTime: executionTime ? executionTime.toISO() : null,
      },
    });

    return job;
  }

  getJobsForGuild(guildId) {
    this.cleanupExpiredAlarms();
    return Array.from(this.scheduledJobs.entries()).filter(([id, jobInfo]) => {
      if (jobInfo.details.guildId !== guildId) return false;
      if (jobInfo.details.dayNumber !== "*") return true;
      if (jobInfo.details.executionTime) {
        const executionTime = DateTime.fromISO(jobInfo.details.executionTime);
        const now = DateTime.now().setZone(jobInfo.details.timezone);
        return executionTime > now;
      }
      return false;
    });
  }

  cleanupExpiredAlarms() {
    const entries = Array.from(this.scheduledJobs.entries());
    for (const [id, jobInfo] of entries) {
      if (jobInfo.details.dayNumber === "*" && jobInfo.details.executionTime) {
        const executionTime = DateTime.fromISO(jobInfo.details.executionTime);
        const now = DateTime.now().setZone(jobInfo.details.timezone);
        if (executionTime < now) {
          console.log(`Cleaning up expired alarm: ${id}`);
          jobInfo.job.stop();
          this.scheduledJobs.delete(id);
        }
      }
    }
  }

  cancelJob(jobId) {
    const jobInfo = this.scheduledJobs.get(jobId);
    if (jobInfo) {
      jobInfo.job.stop();
      this.scheduledJobs.delete(jobId);
      return true;
    }
    return false;
  }
}

module.exports = new ScheduleService();