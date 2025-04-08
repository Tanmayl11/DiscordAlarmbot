module.exports = {
  throttleTime: 5000,
  cleanupInterval: 5 * 60 * 1000,
  port: process.env.PORT || 8000,
  pingInterval: 2 * 60 * 1000, // Ping every 5 minutes (adjust as needed)
};