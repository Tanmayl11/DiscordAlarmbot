const { Client, GatewayIntentBits } = require("discord.js");
const express = require("express");
const config = require("./config");

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
app.listen(config.port, () =>
  console.log(`Health check server listening on port ${config.port}`)
);

// Error handling
client.on("error", console.error);
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully.");
  client.destroy();
  process.exit(0);
});

module.exports = { client };
