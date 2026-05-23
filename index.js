require("dotenv").config();
const { client } = require("./src/bot");
const { deployCommands } = require("./deploy-commands");
const { handleInteraction } = require("./src/handlers/interactionHandler");
const messageWatcherService = require("./src/services/messageWatcherService");

client.once("clientReady", async () => {
  console.log(`Bot is ready. Logged in as ${client.user.tag}`);
  try {
    await deployCommands();
    console.log("Slash commands deployed successfully");
  } catch (error) {
    console.error("Error deploying slash commands:", error);
  }
});

client.on("interactionCreate", handleInteraction);

// Listen to every message and forward to the watcher service
client.on("messageCreate", (message) => {
  messageWatcherService.handleMessage(message, client);
});

client.login(process.env.DISCORD_BOT_TOKEN);