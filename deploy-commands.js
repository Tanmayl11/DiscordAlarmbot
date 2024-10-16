const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'src/commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(`./src/commands/${file}`);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_BOT_TOKEN);

async function getExistingCommands() {
  try {
    return await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
  } catch (error) {
    console.error('Error fetching existing commands:', error);
    return [];
  }
}

async function deployCommands() {
  try {
    console.log('Checking existing application (/) commands...');

    const existingCommands = await getExistingCommands();
    console.log(`Found ${existingCommands.length} existing commands:`);
    existingCommands.forEach(cmd => console.log(`- ${cmd.name}`));
    
    if (JSON.stringify(existingCommands) !== JSON.stringify(commands)) {
      console.log('Updating application (/) commands...');

      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands },
      );

      console.log('Successfully reloaded application (/) commands.');
    } else {
      console.log('Application (/) commands are up to date.');
    }
  } catch (error) {
    console.error('Error deploying commands:', error);
    throw error;
  }
}

module.exports = { deployCommands };