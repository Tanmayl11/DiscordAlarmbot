const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const { parseTime, getDayChoices, DAYS } = require("../utils/timeUtils");
const { IANAZone } = require("luxon");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("repeat")
    .setDescription("Schedule a repeating message on a specific day of the week and time")
    .addStringOption((option) =>
      option
        .setName("day")
        .setDescription("Day of the week")
        .setRequired(true)
        .addChoices(...getDayChoices())
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Time in HH:MM format")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("timezone")
        .setDescription("Choose your timezone")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to schedule")
        .setRequired(true)
    ),

  async execute(interaction) {
    const day = interaction.options.getString("day");
    const time = interaction.options.getString("time");
    const timezone = interaction.options.getString("timezone");
    const scheduledMessage = interaction.options.getString("message");

    // Validate timezone using Luxon
    if (!IANAZone.isValidZone(timezone)) {
      return interaction.reply({
        content: "Invalid timezone.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { hours, minutes } = parseTime(time);

      const dayChoices = getDayChoices();
      const dayChoice = dayChoices.find((choice) => choice.value === day.toLowerCase());
      if (!dayChoice) {
        return interaction.reply({
          content: "Invalid day of the week.",
          flags: MessageFlags.Ephemeral,
        });
      }
      const dayIndex = dayChoice.index; // 0=Monday, 6=Sunday (Monday-first)

      await scheduleService.scheduleMessage(
        interaction,
        timezone,
        `${hours}:${minutes}`,
        scheduledMessage,
        dayIndex
      );

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Repeating Message Scheduled")
        .addFields(
          { name: "Day", value: DAYS[dayIndex] },
          { name: "Time", value: `${time} ${timezone}` },
          { name: "Message", value: scheduledMessage },
          { name: "ID", value: interaction.id }
        );

      await interaction.editReply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error in repeat command:", error);
      await interaction.editReply({
        content: `An error occurred: ${error.message}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};