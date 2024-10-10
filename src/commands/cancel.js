const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const scheduleService = require('../services/scheduleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cancel')
    .setDescription('Cancel a scheduled alert by its interaction ID')
    .addStringOption(option => 
      option.setName('interactionid')
        .setDescription('The interaction ID of the scheduled alert')
        .setRequired(true)),
  async execute(interaction) {
    const interactionId = interaction.options.getString('interactionid');
    try {
       // Defer the reply to allow more time for processing
       await interaction.deferReply({ ephemeral: true });
      const success = scheduleService.cancelJob(interactionId);

      if (success) {
        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Alert Canceled')
          .setDescription(`Alert with ID ${interactionId} has been canceled.`);

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply(`No alert found with ID ${interactionId}.`);
      }
    } catch (error) {
      console.error('Error in cancel command:', error);
      await interaction.editReply({ content: `An error occurred: ${error.message}`, ephemeral: true });
    }
  },
};