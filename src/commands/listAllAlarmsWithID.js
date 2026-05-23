const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const { createAlarmComparator, formatAlarmTiming } = require("../utils/timeUtils");

function formatAlarmListWithID(sortedAlarms) {
  return sortedAlarms.map(([id, jobInfo]) => {
    const { timezone, message: alarmMessage } = jobInfo.details;
    const timing = formatAlarmTiming(jobInfo);
    return `ID: ${id}\nSchedule: ${timing} ${timezone}\nMessage: "${alarmMessage}"`;
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-all-alarms-with-id")
    .setDescription("List all active alarms for this server with IDs. Requires Manage Server.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      scheduleService.cleanupExpiredAlarms();
      const guildAlarms = scheduleService.getJobsForGuild(interaction.guild.id);

      if (guildAlarms.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor("#FFD700")
              .setTitle("No Active Alarms")
              .setDescription("No active alarms on this server.")
              .setFooter({ text: "This information is visible only to you." }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      const sortedAlarms = guildAlarms.toSorted(createAlarmComparator());
      const description = formatAlarmListWithID(sortedAlarms).join("\n\n").substring(0, 4096);

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Active Alarms")
            .setDescription(description)
            .setFooter({ text: "This information is visible only to you." }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error(`Error in list-all-alarms-with-id:`, error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};