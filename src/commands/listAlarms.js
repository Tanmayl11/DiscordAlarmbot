const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const scheduleService = require('../services/scheduleService');
const { hasAdminOrLeaderRole } = require('../utils/permissionUtils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-alarms')
    .setDescription('List all active alarms for this server'),
  async execute(interaction) {
    if (!hasAdminOrLeaderRole(interaction.member)) {
      return interaction.reply({ content: 'You do not have permission to list alarms. Only users with Admin or Leader roles can use this command.', ephemeral: true });
    }

    try {
      scheduleService.cleanupExpiredAlarms();

      const guildAlarms = scheduleService.getJobsForGuild(interaction.guild.id);

      if (guildAlarms.length === 0) {
        return interaction.reply('There are no active alarms for this server.');
      }

      const alarmList = guildAlarms.map(([id, jobInfo]) => {
        const { timezone, time, message: alarmMessage, dayNumber } = jobInfo.details;
        const dayText = dayNumber === '*' ? 'once' : `every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNumber]}`;
        return `ID: ${id}\nSchedule: ${dayText} at ${time} ${timezone}\nMessage: "${alarmMessage}"`;
      });

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Active Alarms')
        .setDescription(alarmList.join('\n\n'));

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in list-alarms command:', error);
      await interaction.reply({ content: `An error occurred: ${error.message}`, ephemeral: true });
    }
  },
};