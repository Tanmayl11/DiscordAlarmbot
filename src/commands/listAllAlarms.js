const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const moment = require("moment-timezone");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-all-alarms")
    .setDescription("List all active alarms for this server"),
    // Removed .setDefaultMemberPermissions(...)

  async execute(interaction) {
    try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Ephemeral is preserved

      scheduleService.cleanupExpiredAlarms();
      const guildAlarms = scheduleService.getJobsForGuild(interaction.guild.id);

      if (guildAlarms.length === 0) {
        const noAlarmsEmbed = new EmbedBuilder()
          .setColor("#FFD700")
          .setTitle("No Active Alarms")
          .setDescription("No active alarms on this server.")
          .setFooter({ text: "This information is visible only to you." });

        return interaction.editReply({
          embeds: [noAlarmsEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }

      const sortedAlarms = guildAlarms.sort(
        ([, jobInfoA], [, jobInfoB]) => {
          const now = moment().tz(jobInfoA.details.timezone);

          const getNextOccurrence = (jobInfo) => {
            const [hours, minutes] = jobInfo.details.time.split(":");
            let nextRun = moment()
              .tz(jobInfo.details.timezone)
              .hour(parseInt(hours))
              .minute(parseInt(minutes))
              .second(0);

            if (jobInfo.details.dayNumber === "*") {
              return moment(jobInfo.details.executionTime);
            }

            const targetDay = parseInt(jobInfo.details.dayNumber);
            const currentDay = nextRun.day();

            if (
              nextRun.isBefore(now) ||
              (nextRun.isSame(now, "day") && currentDay !== targetDay)
            ) {
              if (targetDay > currentDay) {
                nextRun.day(targetDay);
              } else {
                nextRun.day(targetDay + 7);
              }
            } else if (currentDay !== targetDay) {
              nextRun.day(targetDay);
            }

            return nextRun;
          };

          const nextA = getNextOccurrence(jobInfoA);
          const nextB = getNextOccurrence(jobInfoB);
          return nextA.diff(nextB);
        }
      );

      // Format without alarm ID
      const alarmList = sortedAlarms.map(([, jobInfo]) => {
        const {
          timezone,
          time,
          message: alarmMessage,
          dayNumber,
        } = jobInfo.details;

        let timing;

        if (dayNumber === "*") {
          const executionTime = moment(jobInfo.details.executionTime);
          timing = `once on ${executionTime.format("MMMM D")} at ${time}`;
        } else {
          const day = [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][dayNumber];
          timing = `every ${day} at ${time}`;
        }

        return `🕒 **Schedule:** ${timing} (${timezone})\n💬 **Message:** "${alarmMessage}"`;
      });

      const description = alarmList.join("\n\n").substring(0, 4096);

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Active Alarms")
        .setDescription(description)
        .setFooter({ text: "This information is visible only to you." });

      await interaction.editReply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral
      });
    } catch (error) {
      console.error(
        `Error in list-alarms command for guild ${interaction.guild.id}:`,
        error
      );
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  },
};
