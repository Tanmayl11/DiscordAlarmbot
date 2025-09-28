const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");
const scheduleService = require("../services/scheduleService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cancel-all-alarms")
    .setDescription("Cancels all active alarms. Only accessible to users with Administrator privileges.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const canceledCount = await scheduleService.cancelAllJobsForGuild(interaction.guild.id);
      
      if (canceledCount === 0) {
        return interaction.editReply({
          content: "There are no active alarms to cancel.",
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.editReply({
        content: `Successfully canceled ${canceledCount} alarm${canceledCount > 1 ? 's' : ''}.`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error in cancel-all-alarms command:", error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
