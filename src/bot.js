const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const config = require("./config");
const scheduleService = require("./services/scheduleService");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Express app for health checks
const app = express();
app.get("/health", (req, res) => res.status(200).json({ status: "healthy" }));
const server = app.listen(config.port, () =>
  console.log(`Health check server listening on port ${config.port}`)
);

// Initialize schedule service with client after ready
client.once("ready", async () => {
  try {
    // Initialize schedule service with client reference
    scheduleService.setClient(client);
    
    // Load existing alarms from database
    await scheduleService.initializeJobs();
    
    console.log(`Bot is ready and initialized. Logged in as ${client.user.tag}`);
  } catch (error) {
    console.error("Error during initialization:", error);
    process.exit(1);
  }
});

// Error handling
client.on("error", console.error);
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Graceful shutdown
async function shutdown() {
  console.log("Shutdown initiated...");
  
  // Stop all cron jobs
  const jobs = await scheduleService.stopAllJobs();
  console.log(`Stopped ${jobs} cron jobs`);
  
  // Disconnect from Discord
  client.destroy();
  console.log("Disconnected from Discord");
  
  // Close Express server
  server.close(() => {
    console.log("Express server closed");
  });

  // Disconnect Prisma
  await scheduleService.disconnect();
  console.log("Disconnected from database");

  process.exit(0);
}

// Handle different shutdown signals
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

module.exports = { client };