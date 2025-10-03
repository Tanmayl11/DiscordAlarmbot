const cron = require("node-cron");
const { DateTime, IANAZone } = require("luxon");
const { PrismaClient } = require("@prisma/client");
const { mapToCronDay, calculateExecutionDate } = require("../utils/timeUtils");

class ScheduleService {
  constructor() {
    this.prisma = new PrismaClient();
    this.activeJobs = new Map(); // interactionId -> cron job
    this.client = null;
  }

  /**
   * Initialize the service - load existing alarms and set up cleanup
   */
  async initialize() {
    try {
      await this.cleanupExpiredAlarms();
      await this.loadActiveAlarms();
      this.setupDailyCleanup();
    } catch (error) {
      console.error("Error initializing schedule service:", error);
      throw error;
    }
  }

  /**
   * Load all active alarms from database and recreate cron jobs
   */
  async loadActiveAlarms() {
    const alarms = await this.prisma.scheduledAlarm.findMany({
      where: { isActive: true }
    });

    for (const alarm of alarms) {
      await this.recreateCronJob(alarm);
    }
  }

  /**
   * Set up daily cleanup job
   */
  setupDailyCleanup() {
    cron.schedule("0 0 * * *", async () => {
      await this.cleanupExpiredAlarms();
    }, { timezone: "UTC" });
  }

  /**
   * Recreate a cron job from database alarm record
   */
  async recreateCronJob(alarm) {
    // Skip expired one-time alarms
    if (alarm.dayNumber === "*" && alarm.executionTime) {
      const executionTime = DateTime.fromISO(alarm.executionTime.toISOString());
      const now = DateTime.now().setZone(alarm.timezone);
      
      if (executionTime < now) {
        await this.deleteExpiredAlarm(alarm.interactionId);
        return;
      }
    }

    const job = cron.schedule(
      alarm.cronExpression,
      async () => await this.executeAlarm(alarm),
      { timezone: alarm.timezone }
    );

    this.activeJobs.set(alarm.interactionId, job);
  }

  /**
   * Execute an alarm - send message and handle cleanup
   */
  async executeAlarm(alarm) {
    try {
      if (!this.client) {
        console.error("Discord client not available");
        return;
      }

      const channel = await this.client.channels.fetch(alarm.channelId);
      if (channel) {
        await channel.send(alarm.message);

        // Delete one-time alarms after execution
        if (alarm.dayNumber === "*") {
          await this.deleteCompletedAlarm(alarm.interactionId);
        }
      }
    } catch (error) {
      console.error(`Error executing alarm ${alarm.interactionId}:`, error);
    }
  }

  /**
   * Schedule a new message
   */
  async scheduleMessage(interaction, timezone, time, message, dayNumber = "*", dateString = null) {
    // Validate inputs
    if (!IANAZone.isValidZone(timezone)) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    this.validateDayNumber(dayNumber);

    const [hours, minutes] = time.split(":");

    // Calculate execution time for one-time alarms
    let executionTime = null;
    let cronExpression;

    if (dayNumber === "*") {
      executionTime = calculateExecutionDate(time, timezone, dateString);
      
      // For one-time alarms, create a cron expression with specific date
      // Format: minute hour day month *
      cronExpression = `${minutes} ${hours} ${executionTime.day} ${executionTime.month} *`;
    } else {
      // For recurring alarms, use day of week
      const cronDay = mapToCronDay(dayNumber);
      cronExpression = `${minutes} ${hours} * * ${cronDay}`;
    }

    // Save to database
    const alarm = await this.prisma.scheduledAlarm.create({
      data: {
        interactionId: interaction.id,
        createdBy: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        timezone,
        time,
        message,
        dayNumber: dayNumber.toString(),
        cronExpression,
        executionTime: executionTime ? executionTime.toJSDate() : null,
        isActive: true,
      },
    });

    // Create and start cron job
    const job = cron.schedule(
      cronExpression,
      async () => await this.executeAlarm(alarm),
      { timezone }
    );

    this.activeJobs.set(interaction.id, job);
    return alarm;
  }

  /**
   * Validate day number input
   */
  validateDayNumber(dayNumber) {
    if (dayNumber !== "*") {
      const dayIndex = parseInt(dayNumber);
      if (isNaN(dayIndex) || dayIndex < 0 || dayIndex > 6) {
        throw new Error(`Invalid dayNumber: ${dayNumber}`);
      }
    }
  }

  /**
   * Get all active alarms for a guild
   */
  async getJobsForGuild(guildId) {
    await this.cleanupExpiredAlarms();
    
    const alarms = await this.prisma.scheduledAlarm.findMany({
      where: {
        guildId,
        isActive: true,
        OR: [
          { dayNumber: { not: "*" } }, // Recurring alarms
          { 
            AND: [
              { dayNumber: "*" },
              { executionTime: { gt: new Date() } }
            ]
          }
        ]
      },
      orderBy: { executionTime: "asc" }
    });

    // Convert to expected format for backward compatibility
    return alarms.map(alarm => [
      alarm.interactionId,
      {
        details: {
          createdBy: alarm.createdBy,
          timezone: alarm.timezone,
          time: alarm.time,
          message: alarm.message,
          dayNumber: alarm.dayNumber,
          channelId: alarm.channelId,
          guildId: alarm.guildId,
          createdAt: alarm.createdAt.toISOString(),
          executionTime: alarm.executionTime ? alarm.executionTime.toISOString() : null,
        },
      },
    ]);
  }

  /**
   * Cancel a specific alarm
   */
  async cancelJob(interactionId) {
    try {
      // Stop cron job
      const job = this.activeJobs.get(interactionId);
      if (job) {
        job.stop();
        this.activeJobs.delete(interactionId);
      }

      // Delete from database
      const result = await this.prisma.scheduledAlarm.deleteMany({
        where: {
          interactionId,
          isActive: true
        }
      });

      return result.count > 0;
    } catch (error) {
      console.error(`Error canceling job ${interactionId}:`, error);
      return false;
    }
  }

  /**
   * Cancel all alarms for a guild
   */
  async cancelAllJobsForGuild(guildId) {
    try {
      // Get all active alarms for the guild
      const alarms = await this.prisma.scheduledAlarm.findMany({
        where: { guildId, isActive: true },
        select: { interactionId: true }
      });

      // Stop all cron jobs
      for (const alarm of alarms) {
        const job = this.activeJobs.get(alarm.interactionId);
        if (job) {
          job.stop();
          this.activeJobs.delete(alarm.interactionId);
        }
      }

      // Delete from database
      const result = await this.prisma.scheduledAlarm.deleteMany({
        where: { guildId, isActive: true }
      });

      return result.count;
    } catch (error) {
      console.error(`Error canceling all jobs for guild ${guildId}:`, error);
      return 0;
    }
  }

  /**
   * Clean up expired one-time alarms
   */
  async cleanupExpiredAlarms() {
    try {
      const now = new Date();
      
      // Find expired alarms
      const expiredAlarms = await this.prisma.scheduledAlarm.findMany({
        where: {
          dayNumber: "*",
          executionTime: { lt: now },
          isActive: true
        },
        select: { interactionId: true }
      });

      // Stop cron jobs
      for (const alarm of expiredAlarms) {
        const job = this.activeJobs.get(alarm.interactionId);
        if (job) {
          job.stop();
          this.activeJobs.delete(alarm.interactionId);
        }
      }

      // Delete from database
      const result = await this.prisma.scheduledAlarm.deleteMany({
        where: {
          dayNumber: "*",
          executionTime: { lt: now }
        }
      });

      return result.count;
    } catch (error) {
      console.error("Error cleaning up expired alarms:", error);
      return 0;
    }
  }

  /**
   * Delete a completed one-time alarm
   */
  async deleteCompletedAlarm(interactionId) {
    try {
      // Stop cron job
      const job = this.activeJobs.get(interactionId);
      if (job) {
        job.stop();
        this.activeJobs.delete(interactionId);
      }

      // Delete from database
      await this.prisma.scheduledAlarm.delete({
        where: { interactionId }
      });
    } catch (error) {
      console.error(`Error deleting completed alarm ${interactionId}:`, error);
    }
  }

  /**
   * Delete an expired alarm
   */
  async deleteExpiredAlarm(interactionId) {
    try {
      await this.prisma.scheduledAlarm.delete({
        where: { interactionId }
      });
    } catch (error) {
      console.error(`Error deleting expired alarm ${interactionId}:`, error);
    }
  }

  /**
   * Set Discord client reference
   */
  setClient(client) {
    this.client = client;
  }

  /**
   * Graceful shutdown
   */
  async disconnect() {
    try {
      // Stop all cron jobs
      let stoppedCount = 0;
      for (const [interactionId, job] of this.activeJobs.entries()) {
        job.stop();
        stoppedCount++;
      }
      
      this.activeJobs.clear();

      // Disconnect from database
      await this.prisma.$disconnect();
      
    } catch (error) {
      console.error("Error during service shutdown:", error);
    }
  }
}

module.exports = new ScheduleService();