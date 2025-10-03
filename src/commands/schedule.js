const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const { parseTime, calculateExecutionDate } = require("../utils/timeUtils");
const { IANAZone } = require("luxon");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("schedule")
    .setDescription("Schedule a message at a specified time")
     .addStringOption((option) =>
      option
        .setName("timezone")
        .setDescription("Choose your timezone")
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((option) =>
      option
        .setName("time")
        .setDescription("Time in HH:MM format (e.g., 14:30)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to schedule")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("date")
        .setDescription("Date in DD/MM/YYYY format (optional - defaults to today or tomorrow)")
        .setRequired(false)
    ),

  async execute(interaction) {
    const time = interaction.options.getString("time");
    const timezone = interaction.options.getString("timezone");
    const scheduledMessage = interaction.options.getString("message");
    const dateString = interaction.options.getString("date");

    // Validate timezone
    if (!IANAZone.isValidZone(timezone)) {
      return interaction.reply({
        content: "Invalid timezone.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      
      // Validate time format
      const { hours, minutes } = parseTime(time);

      // Schedule the message (validation happens inside)
      await scheduleService.scheduleMessage(
        interaction,
        timezone,
        `${hours}:${minutes}`,
        scheduledMessage,
        "*",
        dateString
      );

      // Calculate execution time for display
      const executionTime = calculateExecutionDate(`${hours}:${minutes}`, timezone, dateString);

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Message Scheduled")
        .addFields(
          { name: "Date", value: executionTime.toFormat("MMMM dd, yyyy") },
          { name: "Time", value: `${time} ${timezone}` },
          { name: "Message", value: scheduledMessage },
          { name: "ID", value: interaction.id }
        )
        .setFooter({ text: "Use /cancel with this ID to cancel the scheduled message" });

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