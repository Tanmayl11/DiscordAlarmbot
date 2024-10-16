// src/services/scheduleService.js
const cron = require('node-cron');
const moment = require('moment-timezone');

class ScheduleService {
  constructor() {
    this.scheduledJobs = new Map();
  }

  async scheduleMessage(interaction, timezone, time, scheduledMessage, dayNumber = '*') {
    const [hours, minutes] = time.split(':');
    const cronExpression = `${minutes} ${hours} * * ${dayNumber}`;

    const job = cron.schedule(cronExpression, async () => {
      try {
        await interaction.channel.send(scheduledMessage);
        console.log('Scheduled message sent successfully.');
        
        if (dayNumber === '*') {
          this.scheduledJobs.delete(interaction.id);
          job.stop();
        }
      } catch (error) {
        console.error('Error sending scheduled message:', error);
      }
    }, { timezone });

    this.scheduledJobs.set(interaction.id, {
      job,
      details: {
        createdBy: interaction.user.id,
        timezone,
        time,
        message: scheduledMessage,
        dayNumber,
        channelId: interaction.channel.id,
        guildId: interaction.guild.id,
        createdAt: moment().tz(timezone).format(),
      },
    });

    return job;
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

  getJobsForGuild(guildId) {
    return Array.from(this.scheduledJobs.entries())
      .filter(([_, jobInfo]) => jobInfo.details.guildId === guildId);
  }

  cleanupExpiredAlarms() {
    const now = moment();
    for (const [id, jobInfo] of this.scheduledJobs.entries()) {
      if (jobInfo.details.dayNumber === '*') {
        const [hours, minutes] = jobInfo.details.time.split(':');
        const alarmTime = moment.tz(jobInfo.details.timezone)
          .hour(parseInt(hours))
          .minute(parseInt(minutes))
          .second(0);
        
        if (alarmTime.isBefore(now)) {
          jobInfo.job.stop();
          this.scheduledJobs.delete(id);
        }
      }
    }
  }
}

module.exports = new ScheduleService();