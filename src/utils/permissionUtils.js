function hasAdminOrLeaderRole(member) {
  return member.roles.cache.some(
    (role) =>
      role.name.toLowerCase() === "admin" ||
      role.name.toLowerCase() === "leader"
  );
}

module.exports = { hasAdminOrLeaderRole };
