// src/commands/listMyAlarms.js
const { SlashCommandBuilder } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const moment = require("moment-timezone");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-my-alarms")
    .setDescription("List all your active alarms in this server"),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const alarms = await scheduleService.prisma.alarm.findMany({
        where: {
          guildId: interaction.guild.id,
          createdBy: interaction.user.id,
          isActive: true,
        },
      });

      if (alarms.length === 0) {
        return interaction.editReply({
          content: "You have no active alarms in this server.",
          ephemeral: true,
        });
      }

      // Sort alarms by next occurrence
      const sortedAlarms = alarms.sort((a, b) => {
        if (a.dayNumber === "*" && b.dayNumber === "*") {
          return moment(a.executionTime).diff(moment(b.executionTime));
        }
        return a.time.localeCompare(b.time);
      });

      const alarmList = sortedAlarms.map((alarm) => {
        const { time, message: alarmMessage, dayNumber, timezone } = alarm;
        let timing;

        if (dayNumber === "*") {
          const executionTime = moment(alarm.executionTime);
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
          ][parseInt(dayNumber)];
          timing = `every ${day} at ${time}`;
        }

        return `ID: ${alarm.id}\nSchedule: ${timing} ${timezone}\nMessage: "${alarmMessage}"`;
      });

      const description = alarmList.join("\n\n").substring(0, 4096);

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Your Active Alarms")
        .setDescription(description);

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(`Error in list-my-alarms command:`, error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        ephemeral: true,
      });
    }
  },
};
