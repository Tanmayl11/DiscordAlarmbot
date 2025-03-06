const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cancel")
    .setDescription("Cancel a scheduled alert by its interaction ID")
    .addStringOption((option) =>
      option
        .setName("interactionid")
        .setDescription("The interaction ID of the scheduled alert")
        .setRequired(true)
    ),
  async execute(interaction) {
    const interactionId = interaction.options.getString("interactionid");
    try {
      // Defer the reply to allow more time for processing
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const success = scheduleService.cancelJob(interactionId);

      if (success) {
        const embed = new EmbedBuilder()
          .setColor("#00ff00")
          .setTitle("Alert Canceled")
          .setDescription(`Alert with ID ${interactionId} has been canceled.`);

        await interaction.editReply({ 
          embeds: [embed],
          flags: MessageFlags.Ephemeral 
        });
      } else {
        await interaction.editReply({
          content: `No alert found with ID ${interactionId}.`,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      console.error("Error in cancel command:", error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};