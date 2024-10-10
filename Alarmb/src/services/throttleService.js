const config = require('../config');

class ThrottleService {
  constructor() {
    this.throttledUsers = new Map();
  }

  throttle(userId) {
    const now = Date.now();
    const lastUsed = this.throttledUsers.get(userId);
    if (lastUsed && now - lastUsed < config.throttleTime) return false;
    this.throttledUsers.set(userId, now);
    return true;
  }

  cleanupThrottledUsers() {
    const now = Date.now();
    for (const [userId, timestamp] of this.throttledUsers.entries()) {
      if (now - timestamp > config.throttleTime) {
        this.throttledUsers.delete(userId);
      }
    }
  }
}

module.exports = new ThrottleService();