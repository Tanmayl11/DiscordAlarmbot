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
      const success = scheduleService.cancelJob(interactionId);

      if (success) {
        const embed = new EmbedBuilder()
          .setColor('#00ff00')
          .setTitle('Alert Canceled')
          .setDescription(`Alert with ID ${interactionId} has been canceled.`);

        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply(`No alert found with ID ${interactionId}.`);
      }
    } catch (error) {
      console.error('Error in cancel command:', error);
      await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
    }
  },
};