const cron = require("node-cron");
const moment = require("moment-timezone");
const { PrismaClient } = require("@prisma/client");

class ScheduleService {
  constructor() {
    this.prisma = new PrismaClient();
    this.activeJobs = new Map(); // Keep track of running cron jobs
    this.initializeJobs(); // Load existing alarms on startup

    // Run cleanup every day at midnight
    cron.schedule("0 0 * * *", () => {
      this.cleanupExpiredAlarms();
    });
  }

  async initializeJobs() {
    try {
      // Clean up any expired alarms before initializing
      await this.cleanupExpiredAlarms();

      const activeAlarms = await this.prisma.alarm.findMany({
        where: { isActive: true },
      });

      for (const alarm of activeAlarms) {
        this.setupCronJob(alarm);
      }

      console.log(`Initialized ${activeAlarms.length} active alarms`);
    } catch (error) {
      console.error("Error initializing jobs:", error);
    }
  }

  setupCronJob(alarm) {
    const [hours, minutes] = alarm.time.split(":");
    const cronExpression = `${minutes} ${hours} * * ${alarm.dayNumber}`;

    const job = cron.schedule(
      cronExpression,
      async () => {
        try {
          // Get the client and channel
          const guild = await this.client?.guilds.fetch(alarm.guildId);
          const channel = await guild?.channels.fetch(alarm.channelId);

          if (channel) {
            await channel.send(alarm.message);
            console.log(
              `Scheduled message sent successfully for alarm ${alarm.id}`
            );

            // For one-time alarms, delete after sending
            if (alarm.dayNumber === "*") {
              await this.deleteAlarm(alarm.id);
            }
          }
        } catch (error) {
          console.error(
            `Error sending scheduled message for alarm ${alarm.id}:`,
            error
          );
        }
      },
      { timezone: alarm.timezone }
    );

    this.activeJobs.set(alarm.id, job);
  }

  async scheduleMessage(
    interaction,
    timezone,
    time,
    scheduledMessage,
    dayNumber = "*"
  ) {
    const [hours, minutes] = time.split(":");
    let executionTime = null;

    if (dayNumber === "*") {
      executionTime = moment()
        .tz(timezone)
        .hour(parseInt(hours))
        .minute(parseInt(minutes))
        .second(0);

      if (executionTime.isBefore(moment().tz(timezone))) {
        executionTime.add(1, "day");
      }
    }

    const alarm = await this.prisma.alarm.create({
      data: {
        id: interaction.id,
        createdBy: interaction.user.id,
        guildId: interaction.guild.id,
        channelId: interaction.channel.id,
        message: scheduledMessage,
        timezone,
        time,
        dayNumber: dayNumber.toString(),
        executionTime: executionTime?.toDate() || null,
        isActive: true,
      },
    });

    this.setupCronJob(alarm);
    return alarm;
  }

  async getJobsForGuild(guildId) {
    await this.cleanupExpiredAlarms();

    const alarms = await this.prisma.alarm.findMany({
      where: {
        guildId: guildId,
        isActive: true,
        OR: [
          { dayNumber: { not: "*" } },
          {
            AND: [{ dayNumber: "*" }, { executionTime: { gt: new Date() } }],
          },
        ],
      },
      orderBy: { executionTime: "asc" },
    });

    return alarms.map((alarm) => [
      alarm.id,
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
          executionTime: alarm.executionTime?.toISOString() || null,
        },
      },
    ]);
  }

  async cleanupExpiredAlarms() {
    const now = new Date();

    // First, find all expired one-time alarms
    const expiredAlarms = await this.prisma.alarm.findMany({
      where: {
        dayNumber: "*",
        executionTime: { lt: now },
      },
    });

    // Stop any active cron jobs for expired alarms
    for (const alarm of expiredAlarms) {
      const job = this.activeJobs.get(alarm.id);
      if (job) {
        job.stop();
        this.activeJobs.delete(alarm.id);
      }
    }

    // Delete the expired alarms from the database
    const result = await this.prisma.alarm.deleteMany({
      where: {
        dayNumber: "*",
        executionTime: { lt: now },
      },
    });

    console.log(`Deleted ${result.count} expired alarms`);
    return result.count;
  }

  async cancelJob(jobId) {
    const job = this.activeJobs.get(jobId);
    if (job) {
      job.stop();
      this.activeJobs.delete(jobId);
    }

    await this.prisma.alarm.delete({
      where: { id: jobId },
    });

    return true;
  }

  async deleteAlarm(alarmId) {
    const job = this.activeJobs.get(alarmId);
    if (job) {
      job.stop();
      this.activeJobs.delete(alarmId);
    }

    await this.prisma.alarm.delete({
      where: { id: alarmId },
    });
  }

  setClient(client) {
    this.client = client;
  }

  async stopAllJobs() {
    let count = 0;
    for (const [id, job] of this.activeJobs) {
      job.stop();
      this.activeJobs.delete(id);
      count++;
    }
    return count;
  }

  async disconnect() {
    await this.stopAllJobs();
    await this.prisma.$disconnect();
  }
}

module.exports = new ScheduleService();
