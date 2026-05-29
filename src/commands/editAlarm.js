const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const { IANAZone } = require("luxon");
const scheduleService = require("../services/scheduleService");
const { parseTime, formatAlarmTiming } = require("../utils/timeUtils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("edit-alarm")
    .setDescription("Edit the time, timezone, or message of an existing alarm")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((opt) =>
      opt
        .setName("id")
        .setDescription("Alarm ID (from /list-all-alarms-with-id)")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("time")
        .setDescription("New time in HH:MM format")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("timezone")
        .setDescription("New timezone")
        .setRequired(false)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("New message text")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const alarmId   = interaction.options.getString("id").trim();
    const newTime   = interaction.options.getString("time");
    const newTz     = interaction.options.getString("timezone");
    const newMsg    = interaction.options.getString("message");

    // At least one field must be provided
    if (!newTime && !newTz && !newMsg) {
      return interaction.editReply({
        content: "❌ Provide at least one field to update: `time`, `timezone`, or `message`.",
      });
    }

    const jobInfo = scheduleService.scheduledJobs.get(alarmId);
    if (!jobInfo) {
      return interaction.editReply({ content: "❌ No alarm found with that ID." });
    }

    // Only allow editing alarms in this guild
    if (jobInfo.details.guildId !== interaction.guild.id) {
      return interaction.editReply({ content: "❌ No alarm found with that ID." });
    }

    const details = jobInfo.details;

    // Validate new values before making any changes
    const resolvedTz  = newTz  || details.timezone;
    const resolvedTime = newTime || details.time;
    const resolvedMsg = newMsg || details.message;

    if (newTz && !IANAZone.isValidZone(newTz)) {
      return interaction.editReply({ content: "❌ Invalid timezone. Use the autocomplete to pick one." });
    }

    if (newTime) {
      try {
        parseTime(newTime);
      } catch {
        return interaction.editReply({ content: "❌ Invalid time format. Use HH:MM (e.g. `14:30`)." });
      }
    }

    // Cancel old job and reschedule with merged values
    scheduleService.cancelJob(alarmId);

    // Reconstruct a minimal interaction-like object so scheduleService can store it
    const fakeInteraction = {
      id: alarmId,
      user: { id: details.createdBy },
      channel: await interaction.guild.channels.fetch(details.channelId).catch(() => null),
      guild: interaction.guild,
    };

    if (!fakeInteraction.channel) {
      return interaction.editReply({
        content: "❌ The original channel for this alarm no longer exists.",
      });
    }

    await scheduleService.scheduleMessage(
      fakeInteraction,
      resolvedTz,
      resolvedTime,
      resolvedMsg,
      details.dayNumber,
      alarmId
    );

    const updatedJob = scheduleService.scheduledJobs.get(alarmId);
    const timing = updatedJob ? formatAlarmTiming(updatedJob) : resolvedTime;

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("#0099ff")
          .setTitle("✅ Alarm Updated")
          .addFields(
            { name: "ID",       value: "`" + alarmId + "`" },
            { name: "Schedule", value: timing + " (" + resolvedTz + ")", inline: true },
            { name: "Message",  value: resolvedMsg }
          ),
      ],
    });
  },
};