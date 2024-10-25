const cron = require('node-cron');
const moment = require('moment-timezone');

class ScheduleService {
  constructor() {
    this.scheduledJobs = new Map();
  }

  async scheduleMessage(interaction, timezone, time, scheduledMessage, dayNumber = '*') {
    const [hours, minutes] = time.split(':');
    const cronExpression = `${minutes} ${hours} * * ${dayNumber}`;

    // Calculate the execution time for one-time alarms
    let executionTime = null;
    if (dayNumber === '*') {
      executionTime = moment().tz(timezone).hour(parseInt(hours)).minute(parseInt(minutes)).second(0);
      
      // If the time has already passed today, set it for tomorrow
      if (executionTime.isBefore(moment().tz(timezone))) {
        executionTime.add(1, 'day');
      }
    }

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
        executionTime: executionTime ? executionTime.format() : null
      },
    });

    return job;
  }

  getJobsForGuild(guildId) {
    // First clean up expired alarms
    this.cleanupExpiredAlarms();

    // Then return the remaining valid alarms
    return Array.from(this.scheduledJobs.entries())
      .filter(([_, jobInfo]) => {
        if (jobInfo.details.guildId !== guildId) {
          return false;
        }

        // Always include recurring alarms
        if (jobInfo.details.dayNumber !== '*') {
          return true;
        }

        // For one-time alarms, compare times in the same timezone
        if (jobInfo.details.executionTime) {
          const executionMoment = moment(jobInfo.details.executionTime);
          const nowMoment = moment().tz(jobInfo.details.timezone);
          return executionMoment.isAfter(nowMoment);
        }

        return false;
      });
  }

  cleanupExpiredAlarms() {
    const entries = Array.from(this.scheduledJobs.entries());
    
    for (const [id, jobInfo] of entries) {
      if (jobInfo.details.dayNumber === '*' && jobInfo.details.executionTime) {
        const executionMoment = moment(jobInfo.details.executionTime);
        const nowMoment = moment().tz(jobInfo.details.timezone);

        if (executionMoment.isBefore(nowMoment)) {
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