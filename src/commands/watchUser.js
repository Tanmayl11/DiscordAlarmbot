const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const messageWatcherService = require("../services/messageWatcherService");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("watch-user")
    .setDescription("Watch a FoeHelper webhook and alert 1 min before scheduled events")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Start watching a webhook or user for FoeHelper time messages")
        .addStringOption((opt) =>
          opt
            .setName("userid")
            .setDescription("Webhook ID or User ID to watch (17–19 digit snowflake)")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("alertchannel")
            .setDescription("Channel where the 1-minute warning will be posted")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Stop watching a webhook or user")
        .addStringOption((opt) =>
          opt
            .setName("userid")
            .setDescription("The Webhook ID or User ID to stop watching")
            .setRequired(true)
        )
        .addChannelOption((opt) =>
          opt
            .setName("alertchannel")
            .setDescription("The alert channel used when this watch was added")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List all active watches for this server")
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const watchedUserId = interaction.options.getString("userid").trim();
      const alertChannel = interaction.options.getChannel("alertchannel");

      if (!/^\d{17,19}$/.test(watchedUserId)) {
        return interaction.reply({
          content:
            "❌ Invalid ID. Provide a valid Discord Webhook ID or User ID (17–19 digits).\n" +
            "Get the Webhook ID from: Channel Settings → Integrations → Webhooks → copy the " +
            "first number from the webhook URL.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const result = messageWatcherService.addWatchConfig(interaction.guild.id, {
        watchedUserId,
        alertChannelId: alertChannel.id,
        addedBy: interaction.user.id,
      });

      if (!result.success) {
        return interaction.reply({
          content: `⚠️ A watch for \`${watchedUserId}\` → <#${alertChannel.id}> already exists.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const embed = new EmbedBuilder()
        .setColor("#00cc66")
        .setTitle("✅ Watch Added")
        .setDescription(
          "Watching for messages like:\n```C5D 05:06 PM, in 2 minutes```\n" +
          "A **1-minute warning** will fire in the alert channel regardless of " +
          "what timezone the sender is in — timing is based on the `in X minutes` offset."
        )
        .addFields(
          { name: "Watching ID", value: `\`${watchedUserId}\``, inline: true },
          { name: "Alert Channel", value: `<#${alertChannel.id}>`, inline: true }
        );

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === "remove") {
      const watchedUserId = interaction.options.getString("userid").trim();
      const alertChannel = interaction.options.getChannel("alertchannel");

      const removed = messageWatcherService.removeWatchConfig(
        interaction.guild.id,
        watchedUserId,
        alertChannel.id
      );

      if (!removed) {
        return interaction.reply({
          content: `❌ No watch found for \`${watchedUserId}\` → <#${alertChannel.id}>.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({
        content: `✅ Stopped watching \`${watchedUserId}\` for alerts in <#${alertChannel.id}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === "list") {
      const configs = messageWatcherService.getWatchConfigs(interaction.guild.id);

      if (configs.length === 0) {
        return interaction.reply({
          content: "📭 No active watches. Use `/watch-user add` to set one up.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const lines = configs.map(
        (c, i) => `**${i + 1}.** \`${c.watchedUserId}\` → <#${c.alertChannelId}>`
      );

      const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("👁️ Active Watches")
        .setDescription(lines.join("\n"))
        .setFooter({ text: "Use /watch-user remove to stop a watch" });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
};