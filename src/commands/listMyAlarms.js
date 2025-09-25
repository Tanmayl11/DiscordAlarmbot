const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const { createAlarmComparator, formatAlarmTiming, DAYS } = require("../utils/timeUtils");

function formatMyAlarmsList(sortedUserJobs) {
  return sortedUserJobs.map(([id, jobInfo]) => {
    const { timezone, message: alarmMessage } = jobInfo.details;
    const timing = formatAlarmTiming(jobInfo);
    return `**Alarm ID:** ${id}\n**Schedule:** ${timing} ${timezone}\n**Message:** "${alarmMessage}"`;
  });
}

function filterUserJobs(allJobs, userId) {
  return allJobs.filter(([jobId, jobInfo]) => jobInfo.details.createdBy === userId);
}

function createNoAlarmsEmbed() {
  return new EmbedBuilder()
    .setColor("#FFD700")
    .setTitle("No Active Alarms")
    .setDescription("You have no active alarms.")
    .setFooter({ text: "This information is visible only to you." });
}

function createMyAlarmsEmbed(description) {
  return new EmbedBuilder()
    .setColor("#0099ff")
    .setTitle("Your Active Alarms")
    .setDescription(description)
    .setFooter({ text: "This information is visible only to you." });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-my-alarms")
    .setDescription("Lists all active alarms created by you."),

  async execute(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const allJobs = scheduleService.getJobsForGuild(guildId);
      const userJobs = filterUserJobs(allJobs, userId);

      if (userJobs.length === 0) {
        const noAlarmsEmbed = createNoAlarmsEmbed();
        return interaction.editReply({
          embeds: [noAlarmsEmbed],
          flags: MessageFlags.Ephemeral,
        });
      }

      const sortedUserJobs = userJobs.toSorted(createAlarmComparator());
      const alarmList = formatMyAlarmsList(sortedUserJobs);
      const description = alarmList.join("\n\n").substring(0, 4096);

      const embed = createMyAlarmsEmbed(description);
      await interaction.editReply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error(`Error in list-my-alarms command for guild ${guildId}:`, error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};