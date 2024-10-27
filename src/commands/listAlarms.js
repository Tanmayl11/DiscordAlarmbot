// src/commands/listAlarms.js
const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const moment = require("moment-timezone");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-all-alarms")
    .setDescription("List all active alarms for this server")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const alarms = await scheduleService.prisma.alarm.findMany({
        where: {
          guildId: interaction.guild.id,
          isActive: true,
        },
      });

      if (alarms.length === 0) {
        return interaction.editReply({
          content: "There are no active alarms for this server.",
          ephemeral: true,
        });
      }

      // Sort alarms by next occurrence
      const sortedAlarms = alarms.sort((a, b) => {
        const now = moment();

        const getNextOccurrence = (alarm) => {
          const [hours, minutes] = alarm.time.split(":");
          let nextRun = moment()
            .tz(alarm.timezone)
            .hour(parseInt(hours))
            .minute(parseInt(minutes))
            .second(0);

          // If it's a one-time alarm, use the execution time
          if (alarm.dayNumber === "*") {
            return moment(alarm.executionTime);
          }

          // For recurring alarms, find the next occurrence
          const targetDay = parseInt(alarm.dayNumber);
          const currentDay = nextRun.day();

          if (
            nextRun.isBefore(now) ||
            (nextRun.isSame(now, "day") && currentDay !== targetDay)
          ) {
            // If time has passed today or it's not the correct day, move to next occurrence
            if (targetDay > currentDay) {
              nextRun.day(targetDay);
            } else {
              nextRun.day(targetDay + 7);
            }
          } else if (currentDay !== targetDay) {
            // If it's not the correct day but time hasn't passed
            nextRun.day(targetDay);
          }

          return nextRun;
        };

        const nextA = getNextOccurrence(a);
        const nextB = getNextOccurrence(b);
        return nextA.diff(nextB);
      });

      // Create the alarm list
      const alarmList = sortedAlarms.map((alarm) => {
        const { time, message: alarmMessage, dayNumber, timezone } = alarm;
        let timing;

        if (dayNumber === "*") {
          // For one-time alarms, show the full date and time
          const executionTime = moment(alarm.executionTime);
          timing = `once on ${executionTime.format("MMMM D")} at ${time}`;
        } else {
          // For recurring alarms, show the day and time
          const day = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][parseInt(dayNumber)];
          timing = `every ${day} at ${time}`;
        }

        return `ID: ${alarm.id}\nSchedule: ${timing} ${timezone}\nMessage: "${alarmMessage}"`;
      });

      const description = alarmList.join("\n\n").substring(0, 4096);

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Active Alarms")
        .setDescription(description);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(
        `Error in list-alarms command for guild ${interaction.guild.id}:`,
        error
      );
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
