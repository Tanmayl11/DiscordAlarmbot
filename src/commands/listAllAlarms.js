const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const { createAlarmComparator, formatAlarmTiming } = require("../utils/timeUtils");

function formatAlarmList(sortedAlarms) {
  return sortedAlarms.map(([, jobInfo]) => {
    const { timezone, message: alarmMessage } = jobInfo.details;
    const timing = formatAlarmTiming(jobInfo);
    return `🕒 **Schedule:** ${timing} (${timezone})\n💬 **Message:** "${alarmMessage}"`;
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-all-alarms")
    .setDescription("List all active alarms for this server"),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

      const sortedAlarms = guildAlarms.toSorted(createAlarmComparator());
      const alarmList = formatAlarmList(sortedAlarms);
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
      console.error(`Error in list-all-alarms command for guild ${interaction.guild.id}:`, error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  },
};