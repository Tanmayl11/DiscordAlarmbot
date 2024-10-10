function parseTime(time) {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error('Invalid time format. Use HH:MM.');
  }
  return { hours, minutes };
}

module.exports = { parseTime };