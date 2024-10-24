const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { EmbedBuilder } = require('discord.js');
const scheduleService = require('../services/scheduleService');
const moment = require('moment-timezone');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('list-all-alarms')
    .setDescription('List all active alarms for this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(interaction) {
    try {
      // Defer the reply to allow more time for processing
      await interaction.deferReply({ ephemeral: true });

      // Cleanup expired alarms
      scheduleService.cleanupExpiredAlarms();

      // Get jobs for the guild
      const guildAlarms = scheduleService.getJobsForGuild(interaction.guild.id);

      // If there are no active alarms, edit the deferred reply
      if (guildAlarms.length === 0) {
        return interaction.editReply({ 
          content: 'There are no active alarms for this server.', 
          ephemeral: true 
        });
      }

      // Sort alarms by the next occurrence time
      const sortedAlarms = guildAlarms.sort(([idA, jobInfoA], [idB, jobInfoB]) => {
        const nextRunA = moment.tz(`${jobInfoA.details.time}`, 'HH:mm', jobInfoA.details.timezone);
        const nextRunB = moment.tz(`${jobInfoB.details.time}`, 'HH:mm', jobInfoB.details.timezone);

        // Handle recurring alarms (dayNumber != '*') by checking the next day they will occur
        if (jobInfoA.details.dayNumber !== '*') {
          nextRunA.day(parseInt(jobInfoA.details.dayNumber));
        }
        if (jobInfoB.details.dayNumber !== '*') {
          nextRunB.day(parseInt(jobInfoB.details.dayNumber));
        }

        return nextRunA.diff(nextRunB);
      });

      // Create the alarm list in ascending order
      const alarmList = sortedAlarms.map(([id, jobInfo]) => {
        const { timezone, time, message: alarmMessage, dayNumber } = jobInfo.details;
        const dayText = dayNumber === '*' ? 'once' : `every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayNumber]}`;
        return `ID: ${id}\nSchedule: ${dayText} at ${time} ${timezone}\nMessage: "${alarmMessage}"`;
      });

      // Ensure the embed doesn't exceed Discord's character limit
      const description = alarmList.join('\n\n').substring(0, 4096);

      // Create an embed with the alarm details
      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Active Alarms')
        .setDescription(description);

      // Edit the deferred reply with the embed
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(`Error in list-alarms command for guild ${interaction.guild.id}:`, error);
      // If an error occurs, edit the reply to show an error message
      await interaction.editReply({ 
        content: `An error occurred: ${error.message}`, 
        ephemeral: true 
      });
    }
  },
};
