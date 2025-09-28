require("dotenv").config();
const { client } = require("./src/bot");
const { deployCommands } = require("./deploy-commands");
const { handleInteraction } = require("./src/handlers/interactionHandler");

// Only handle interactions and deploy commands
client.on("interactionCreate", handleInteraction);

// Deploy commands when ready (but don't log ready message here)
client.once("clientReady", async () => {
  try {
    await deployCommands();
  } catch (error) {
    console.error("Error deploying slash commands:", error);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);