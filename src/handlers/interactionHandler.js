const fs = require("node:fs");
const path = require("node:path");
const { MessageFlags } = require("discord.js");
const { getAllTimezones } = require("../utils/timeUtils");

const commands = new Map();
const commandFiles = fs
  .readdirSync(path.join(__dirname, "../commands"))
  .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
  const command = require(`../commands/${file}`);
  commands.set(command.data.name, command);
}

// Pre-sort once at startup so autocomplete only needs to filter, not sort
const ALL_TIMEZONES_SORTED = getAllTimezones()
  .sort((a, b) => a.offsetMinutes - b.offsetMinutes || a.name.localeCompare(b.name));

async function handleAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== "timezone") {
    try {
      await interaction.respond([]);
    } catch (err) {
      if (err.code !== 10062) console.error("Autocomplete error:", err);
    }
    return;
  }

  const query = focused.value.toLowerCase();
  const filtered = query
    ? ALL_TIMEZONES_SORTED.filter((tz) => tz.name.toLowerCase().includes(query)).slice(0, 25)
    : ALL_TIMEZONES_SORTED.slice(0, 25);

  try {
    await interaction.respond(filtered.map((tz) => ({ name: tz.name, value: tz.value })));
  } catch (err) {
    if (err.code !== 10062) console.error("Autocomplete error:", err);
  }
}

async function handleInteraction(interaction) {
  if (interaction.isAutocomplete()) {
    return handleAutocomplete(interaction);
  }

  if (!interaction.isCommand()) return;

  const command = commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    await interaction.reply({
      content: "There was an error while executing this command!",
      flags: MessageFlags.Ephemeral,
    });
  }
}

module.exports = { handleInteraction };