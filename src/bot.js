const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const config = require("./config");
const axios = require("axios"); // Add this for HTTP requests

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
  // Get the URL from environment variable or construct it
  const appUrl = process.env.APP_URL || `http://localhost:${config.port}`;
  
  console.log(`Setting up self-ping to ${appUrl}/health every ${config.pingInterval}ms`);
  
  setInterval(async () => {
    try {
      const response = await axios.get(`${appUrl}/health`);
      console.log(`Self-ping successful: ${response.status}`);
    } catch (error) {
      console.error("Self-ping failed:", error.message);
    }
  }, config.pingInterval);
};

// Start self-pinging after the bot is ready
client.once("ready", () => {
  startSelfPing();
});

// Error handling
client.on("error", console.error);
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully.");
  client.destroy();
  server.close();
  process.exit(0);
});

module.exports = { client };