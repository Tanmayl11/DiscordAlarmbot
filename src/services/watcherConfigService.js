/**
 * Stores per-guild ping rules for the message watcher.
 *
 * Each rule: { id, keywords: string[], roleIds: string[] }
 * When ANY keyword in a rule matches message content, ALL roles in that rule are pinged.
 *
 * Multiple rules are supported per guild — different keywords can trigger different roles.
 */
class WatcherConfigService {
  constructor() {
    // Map of guildId -> Rule[]
    this.rules = new Map();
    this._counter = 0;
  }

  _getRules(guildId) {
    if (!this.rules.has(guildId)) this.rules.set(guildId, []);
    return this.rules.get(guildId);
  }

  addRule(guildId, keywords, roleIds) {
    const id = ++this._counter;
    const rule = {
      id,
      keywords: keywords.map((k) => k.trim().toLowerCase()),
      roleIds,
    };
    console.log(`[WatcherConfig] addRule guild=${guildId}`, JSON.stringify(rule));
    this._getRules(guildId).push(rule);
    return id;
  }

  removeRule(guildId, ruleId) {
    const rules = this._getRules(guildId);
    const filtered = rules.filter((r) => r.id !== ruleId);
    this.rules.set(guildId, filtered);
    return filtered.length < rules.length;
  }

  getRules(guildId) {
    return this._getRules(guildId);
  }

  /**
   * Returns a string of all role mentions that should be pinged for this message,
   * or "" if no rules match.
   * A rule matches if ANY of its keywords appears in the message content.
   */
  resolvePings(guildId, content) {
    const lower = content.toLowerCase();
    const mentions = new Set();

    for (const rule of this._getRules(guildId)) {
      const matched = rule.keywords.some((kw) => lower.includes(kw));
      if (matched) rule.roleIds.forEach((id) => mentions.add(id));
    }

    return [...mentions]
      .map((id) => (id === "@here" || id === "@everyone" ? id : "<@&" + id + ">"))
      .join(" ");
  }
}

module.exports = new WatcherConfigService();