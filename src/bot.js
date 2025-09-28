const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const config = require("./config");
const axios = require("axios");
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

// Self-pinging mechanism
const startSelfPing = () => {
  const appUrl = process.env.APP_URL || `http://localhost:${config.port}`;
  
  const pingInterval = setInterval(async () => {
    try {
      await axios.get(`${appUrl}/health`);
    } catch (error) {
      console.error("Self-ping failed:", error.message);
    }
  }, config.pingInterval);

  return pingInterval;
};

let pingInterval;

// Single ready handler - this should be the ONLY "clientReady" handler
client.once("clientReady", async () => {
  console.log(`Bot is ready. Logged in as ${client.user.tag}`);
  
  try {
    // Set the client reference for schedule service
    scheduleService.setClient(client);
    
    // Initialize the schedule service
    await scheduleService.initialize();
    console.log("Schedule service initialized successfully");
  } catch (error) {
    console.error("Error initializing schedule service:", error);
  }
  
  pingInterval = startSelfPing();
});

// Error handling
client.on("error", console.error);
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Graceful shutdown
async function gracefulShutdown(signal) {
  console.log(`${signal} received. Shutting down gracefully...`);
  
  try {
    if (pingInterval) {
      clearInterval(pingInterval);
    }

    await scheduleService.disconnect();
    client.destroy();
    
    server.close(() => {
      process.exit(0);
    });

  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C

module.exports = { client };