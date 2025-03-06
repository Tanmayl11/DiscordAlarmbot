const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const moment = require("moment-timezone");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-my-alarms")
    .setDescription("Lists all active alarms created by you."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const allJobs = scheduleService.getJobsForGuild(guildId);
      const userJobs = allJobs.filter(
        ([jobId, jobInfo]) => jobInfo.details.createdBy === userId
      );

      if (userJobs.length === 0) {
        const noAlarmsEmbed = new EmbedBuilder()
          .setColor("#FFD700") // Yellow color
          .setTitle("No Active Alarms")
          .setDescription("You have no active alarms.")
          .setFooter({ text: "This information is visible only to you." });

        return interaction.editReply({
          embeds: [noAlarmsEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }

      // Sort alarms by their next occurrence
      const sortedUserJobs = userJobs.sort(
        ([idA, jobInfoA], [idB, jobInfoB]) => {
          const now = moment().tz(jobInfoA.details.timezone);

          // For one-time alarms, use the execution time directly
          if (
            jobInfoA.details.dayNumber === "*" &&
            jobInfoB.details.dayNumber === "*"
          ) {
            const timeA = moment(jobInfoA.details.executionTime);
            const timeB = moment(jobInfoB.details.executionTime);
            return timeA.diff(timeB);
          }

          // Calculate next occurrence for both alarms
          const getNextOccurrence = (jobInfo) => {
            const [hours, minutes] = jobInfo.details.time.split(":");
            let nextRun = moment()
              .tz(jobInfo.details.timezone)
              .hour(parseInt(hours))
              .minute(parseInt(minutes))
              .second(0);

            // If it's a one-time alarm, use the execution time
            if (jobInfo.details.dayNumber === "*") {
              return moment(jobInfo.details.executionTime);
            }

            // For recurring alarms, find the next occurrence
            const targetDay = parseInt(jobInfo.details.dayNumber);
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

          const nextA = getNextOccurrence(jobInfoA);
          const nextB = getNextOccurrence(jobInfoB);
          return nextA.diff(nextB);
        }
      );

      // Create the alarm list with more detailed timing information
      const alarmList = sortedUserJobs.map(([id, jobInfo]) => {
        const {
          timezone,
          time,
          message: alarmMessage,
          dayNumber,
        } = jobInfo.details;
        let timing;

        if (dayNumber === "*") {
          // For one-time alarms, show the full date and time
          const executionTime = moment(jobInfo.details.executionTime);
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
          ][dayNumber];
          timing = `every ${day} at ${time}`;
        }

        return `**Alarm ID:** ${id}\n**Schedule:** ${timing} ${timezone}\n**Message:** "${alarmMessage}"`;
      });

      const description = alarmList.join("\n\n").substring(0, 4096);

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Your Active Alarms")
        .setDescription(description)
        .setFooter({ text: "This information is visible only to you." });

      await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error("Error in list-my-alarms command:", error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
