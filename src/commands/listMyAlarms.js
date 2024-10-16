const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const scheduleService = require('../services/scheduleService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-my-alarms')
    .setDescription('Lists all active alarms created by you.'),
  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
      await interaction.deferReply({ ephemeral: true });

      const allJobs = scheduleService.getJobsForGuild(guildId);
      const userJobs = allJobs.filter(([jobId, jobInfo]) => jobInfo.details.createdBy === userId);

      if (userJobs.length === 0) {
        return interaction.editReply({ content: 'You have no active alarms.', ephemeral: true });
      }

      const alarmList = userJobs.map(([jobId, jobInfo]) => {
        const { timezone, time, message: alarmMessage, dayNumber } = jobInfo.details;
        const dayText = dayNumber === '*' ? 'once' : `every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNumber]}`;
        return `**Alarm ID:** ${jobId}\n**Schedule:** ${dayText} at ${time} ${timezone}\n**Message:** "${alarmMessage}"`;
      });

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Your Active Alarms')
        .setDescription(alarmList.join('\n\n'))
        .setFooter({ text: 'This information is visible only to you.' });

      await interaction.editReply({ embeds: [embed], ephemeral: true });
    } catch (error) {
      console.error('Error in list-my-alarms command:', error);
      await interaction.editReply({ content: `An error occurred: ${error.message}`, ephemeral: true });
    }
  },
};