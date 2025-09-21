const moment = require("moment-timezone");

function parseTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    throw new Error("Invalid time format. Use HH:MM.");
  }
  return { hours, minutes };
}

// Build full timezone suggestion list
function getAllTimezones() {
  return moment.tz.names().map((tz) => {
    const offsetMinutes = moment().tz(tz).utcOffset();
    const offset = moment().tz(tz).format("Z"); // +05:30
    const abbrev = moment().tz(tz).format("z"); // IST, PDT
    const city = tz.split("/").pop().replace(/_/g, " "); // "Los Angeles"
    return {
      name: `${city} (${abbrev}, UTC${offset})`,
      value: tz,
      offsetMinutes,
    };
  });
}

// Day-of-week choices (Monday–Sunday)
function getDayChoices() {
  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  return days.map((day) => ({ name: day, value: day.toLowerCase() }));
}

module.exports = { parseTime, getAllTimezones, getDayChoices };
