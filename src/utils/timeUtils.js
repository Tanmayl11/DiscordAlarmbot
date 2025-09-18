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

// Base set of 25 timezones (one per unique UTC offset, with DST and non-DST representation)
const baseTimezones = [
  "Pacific/Midway",      // UTC-12:00, no DST
  "Pacific/Niue",        // UTC-11:00, no DST
  "Pacific/Honolulu",    // UTC-10:00, no DST
  "America/Anchorage",   // UTC-9:00, DST (AKDT in Sep 2025)
  "America/Los_Angeles", // UTC-8:00, DST (PDT)
  "America/Denver",      // UTC-7:00, DST (MDT)
  "America/Mexico_City", // UTC-6:00, DST (CDT)
  "America/Chicago",     // UTC-5:00, DST (CDT)
  "America/New_York",    // UTC-4:00, DST (EDT)
  "America/Sao_Paulo",   // UTC-3:00, no DST
  "America/Noronha",     // UTC-2:00, no DST
  "Atlantic/Cape_Verde", // UTC-1:00, no DST
  "Etc/UTC",             // UTC+0:00, no DST
  "Africa/Lagos",        // UTC+1:00, no DST
  "Europe/Paris",        // UTC+2:00, DST (CEST)
  "Europe/Moscow",       // UTC+3:00, no DST
  "Asia/Dubai",          // UTC+4:00, no DST
  "Asia/Tashkent",       // UTC+5:00, no DST
  "Asia/Kolkata",        // UTC+5:30, no DST
  "Asia/Almaty",         // UTC+6:00, no DST
  "Asia/Bangkok",        // UTC+7:00, no DST
  "Asia/Shanghai",       // UTC+8:00, no DST
  "Asia/Tokyo",          // UTC+9:00, no DST
  "Australia/Sydney",    // UTC+10:00, no DST in Sep 2025
  "Pacific/Auckland",    // UTC+12:00, no DST in Sep 2025
];

// Dynamic timezone choices with current offset + abbreviation
function getTimezoneChoices() {
  return baseTimezones
    .map((tz) => {
      const offsetMinutes = moment().tz(tz).utcOffset();
      const offset = moment().tz(tz).format("Z"); // e.g., +05:30
      const abbrev = moment().tz(tz).format("z"); // e.g., IST, PDT
      const city = tz.split("/").pop().replace(/_/g, " "); // e.g., Los Angeles
      return {
        name: `${city} (${abbrev}, UTC${offset})`,
        value: tz,
        offsetMinutes,
      };
    })
    .sort((a, b) => a.offsetMinutes - b.offsetMinutes); // Sort by UTC offset
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

module.exports = { parseTime, getTimezoneChoices, getDayChoices };