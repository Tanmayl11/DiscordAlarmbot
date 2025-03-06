const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { EmbedBuilder } = require("discord.js");
const scheduleService = require("../services/scheduleService");
const { parseTime } = require("../utils/timeUtils");
const moment = require("moment-timezone");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("repeat")
    .setDescription(
      "Schedule a repeating message on a specific day of the week and time"
    )
    .addStringOption((option) =>
      option
        .setName("day")
        .setDescription("Day of the week (e.g., Monday)")
        .setRequired(true)
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
        .setDescription("Timezone (e.g., America/New_York)")
        .setRequired(true)
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

    if (!moment.tz.zone(timezone)) {
      return interaction.reply({
        content: "Invalid timezone.",
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const { hours, minutes } = parseTime(time);
      const validDays = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ];
      const dayIndex = validDays.indexOf(day.toLowerCase());

      if (dayIndex === -1) {
        return interaction.reply({
          content:
            "Invalid day of the week. Please provide a valid day (e.g., Monday).",
          flags: MessageFlags.Ephemeral,
        });
      }

      const job = await scheduleService.scheduleMessage(
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
          { name: "Day", value: day },
          { name: "Time", value: `${time} ${timezone}` },
          { name: "Message", value: scheduledMessage },
          { name: "ID", value: interaction.id }
        );

      await interaction.editReply({ 
        embeds: [embed],
        flags: MessageFlags.Ephemeral
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