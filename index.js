require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { deployCommands } = require('./deploy-commands');
const { handleInteraction } = require('./src/handlers/interactionHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ],
});

client.once('ready', async () => {
  console.log(`Bot is ready. Logged in as ${client.user.tag}`);
  try {
    await deployCommands();
    console.log('Slash commands deployed successfully');
  } catch (error) {
    console.error('Error deploying slash commands:', error);
  }
});

client.on('interactionCreate', handleInteraction);

client.login(process.env.DISCORD_BOT_TOKEN);