const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
} = require("discord.js");
const watcherConfigService = require("../services/watcherConfigService");

// ── helpers ────────────────────────────────────────────────────────────────

const SPECIAL_MENTIONS = { "@here": "@here", "@everyone": "@everyone" };

function parseRoleIds(rolesRaw) {
  return rolesRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (SPECIAL_MENTIONS[s.toLowerCase()]) return SPECIAL_MENTIONS[s.toLowerCase()];
      // Extract numeric ID from a role mention like <@&123456> or bare 123456
      const id = s.replace(/[<@&>]/g, "").trim();
      return id || null;
    })
    .filter(Boolean);
}

function formatMention(idOrSpecial) {
  if (idOrSpecial === "@here" || idOrSpecial === "@everyone") return idOrSpecial;
  return "<@&" + idOrSpecial + ">";
}

function parseKeywords(keywordsRaw) {
  return keywordsRaw.split(",").map((s) => s.trim()).filter(Boolean);
}

function looksLikeEmoji(str) {
  return [...str].some((c) => c.codePointAt(0) > 0x2000);
}

function formatRule(rule, guild) {
  const keywords = rule.keywords.map((k) => "`" + k + "`").join(", ");
  const roles = rule.roleIds.map((id) => {
    if (id === "@here" || id === "@everyone") return id;
    const role = guild.roles.cache.get(id);
    return role ? role.toString() : "Unknown role (`" + id + "`)";
  }).join(", ");
  return "🔹 **ID: `" + rule.id + "`**\n**Keywords:** " + keywords + "\n**Roles:** " + roles;
}

// ── sub-command handlers ───────────────────────────────────────────────────

function handleAdd(interaction, guildId) {
  const keywordsRaw = interaction.options.getString("keywords");
  const rolesRaw = interaction.options.getString("roles");

  const keywords = parseKeywords(keywordsRaw);
  const roleIds = parseRoleIds(rolesRaw);

  if (keywords.length === 0) {
    return interaction.reply({ content: "❌ Provide at least one keyword.", flags: MessageFlags.Ephemeral });
  }
  if (roleIds.length === 0) {
    return interaction.reply({ content: "❌ Provide at least one role.", flags: MessageFlags.Ephemeral });
  }

  const emojiWarning = keywords.some(looksLikeEmoji)
    ? "\n\n⚠️ One or more keywords look like Unicode emoji. If FoeHelper sends `:robot:` as text, type it as `:robot:` — not from the emoji picker."
    : "";

  const id = watcherConfigService.addRule(guildId, keywords, roleIds);
  const resolvedRoles = roleIds.map((rid) => {
    if (rid === "@here" || rid === "@everyone") return rid;
    const role = interaction.guild.roles.cache.get(rid);
    return role ? role.toString() : "Unknown role (`" + rid + "`)";
  });

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(emojiWarning ? "#FF9900" : "#00cc66")
        .setTitle("✅ Ping Rule Added")
        .setDescription(
          `**Rule ${id}** created.${emojiWarning}\n\n` +
          `**Keywords:** ${keywords.map((k) => "`" + k + "`").join(", ")}\n` +
          `**Roles:** ${resolvedRoles.join(", ")}\n\n` +
          `When any keyword appears in a FoeHelper message, all listed roles will be pinged.`
        ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

function handleRemove(interaction, guildId) {
  const ruleId = Number.parseInt(interaction.options.getString("ruleid"), 10);
  if (Number.isNaN(ruleId)) {
    return interaction.reply({ content: "❌ Invalid rule ID. Use `/watcher-config list` to see IDs.", flags: MessageFlags.Ephemeral });
  }

  const removed = watcherConfigService.removeRule(guildId, ruleId);
  return interaction.reply({
    content: removed ? `✅ Rule ${ruleId} removed.` : `❌ No rule found with ID ${ruleId}.`,
    flags: MessageFlags.Ephemeral,
  });
}

function handleList(interaction, guildId) {
  const rules = watcherConfigService.getRules(guildId);

  if (rules.length === 0) {
    return interaction.reply({
      content: "📭 No ping rules configured. Use `/watcher-config add` to create one.",
      flags: MessageFlags.Ephemeral,
    });
  }

  return interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("👁️ Watcher Ping Rules")
        .setDescription(rules.map((r) => formatRule(r, interaction.guild)).join("\n\n"))
        .setFooter({ text: "To delete a rule: /watcher-config remove ruleid:<ID shown above>" }),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

const SUB_HANDLERS = {
  "add-keyword-role": handleAdd,
  remove: handleRemove,
  list: handleList,
};

// ── command definition ─────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName("watcher-config")
    .setDescription("Configure role pinging for auto-detected FoeHelper alarms")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a rule: comma-separated keywords that ping comma-separated roles")
        .addStringOption((opt) =>
          opt
            .setName("keywords")
            .setDescription("Keyword(s) to match, comma-separated (e.g. ':robot:, attack'). Type :robot: as text.")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("roles")
            .setDescription("Role(s) to ping, comma-separated — mention them: @Dragon, @Officer")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a ping rule by its ID")
        .addStringOption((opt) =>
          opt
            .setName("ruleid")
            .setDescription("Rule ID from /watcher-config list")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("Show all active ping rules for this server")
    ),

  async execute(interaction) {
    const handler = SUB_HANDLERS[interaction.options.getSubcommand()];
    if (handler) return handler(interaction, interaction.guild.id);
  },
};
