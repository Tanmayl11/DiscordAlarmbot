const { SlashCommandBuilder,PermissionFlagsBits } = require('discord.js');
const scheduleService = require('../services/scheduleService');
const { hasAdminOrLeaderRole } = require('../utils/permissionUtils'); // Assuming you store the helper function here

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cancel-all-alarms')
        .setDescription('Cancels all active alarms. Only accessible by Leaders and Admins.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // Check if the member has the required roles
//        const member = interaction.member;
//        if (!hasAdminOrLeaderRole(member)) {
//            return interaction.reply({
//                content: 'You do not have permission to use this command.',
//                ephemeral: true
//            });
//        }

        // Cancel all alarms for the guild
        const jobs = scheduleService.getJobsForGuild(interaction.guild.id);
        if (jobs.length === 0) {
            return interaction.reply({
                content: 'There are no active alarms to cancel.',
                ephemeral: true
            });
        }

        jobs.forEach(([jobId, jobInfo]) => {
            scheduleService.cancelJob(jobId);
        });

        await interaction.reply({
            content: 'All alarms have been successfully canceled.',
            ephemeral: true
        });
    },
};
