const fs = require("fs");
const path = require("path");
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

async function handleInteraction(interaction) {
  // 🔹 Handle Autocomplete
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === "timezone") {
      const allZones = getAllTimezones();

      const filtered = allZones
        .filter((tz) =>
          tz.name.toLowerCase().includes(focused.value.toLowerCase())
        )
        .sort((a, b) => a.offsetMinutes - b.offsetMinutes)
        .slice(0, 25); // Discord limit

      await interaction.respond(
        filtered.map((tz) => ({
          name: tz.name,
          value: tz.value,
        }))
      );
    }
    return;
  }

  // 🔹 Handle Commands
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
