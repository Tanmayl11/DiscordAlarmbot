const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const { parseTime } = require("../utils/timeUtils");
const moment = require("moment-timezone");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Schedule a message at a specified time")
    .addStringOption((option) =>
      option
        .setName("timezone")
        .setDescription("Choose your timezone")
        .setRequired(true)
        .setAutocomplete(true) // 🔹 changed
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Time in HH:MM format")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to schedule")
        .setRequired(true)
    ),

  async execute(interaction) {
    const timezone = interaction.options.getString("timezone");
    const time = interaction.options.getString("time");
    const scheduledMessage = interaction.options.getString("message");

    if (!moment.tz.zone(timezone)) {
      return interaction.reply({
        content: "Invalid timezone.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { hours, minutes } = parseTime(time);

      await scheduleService.scheduleMessage(
        interaction,
        timezone,
        `${hours}:${minutes}`,
        scheduledMessage
      );

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Message Scheduled")
        .addFields(
          { name: "Time", value: `${time} ${timezone}` },
          { name: "Message", value: scheduledMessage },
          { name: "ID", value: interaction.id }
        );

      await interaction.editReply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error in schedule command:", error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
