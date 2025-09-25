const { DateTime } = require("luxon");

// Centralized day array (Monday-first, 0-based index)
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

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

// Cache timezones at startup
let cachedTimezones = null;

function getAllTimezones() {
  if (!cachedTimezones) {
    try {
      cachedTimezones = Intl.supportedValuesOf("timeZone")
        .map((tz) => {
          const dt = DateTime.now().setZone(tz);
          const offset = dt.toFormat("ZZ");
          const abbrev = dt.toFormat("ZZZZZ");
          const city = tz.split("/").pop().replace(/_/g, " ");
          return {
            name: `${city} (${abbrev}, UTC${offset})`,
            value: tz,
            offsetMinutes: dt.offset,
          };
        })
        .sort((a, b) => {
          return a.offsetMinutes - b.offsetMinutes || a.name.localeCompare(b.name);
        });
    } catch (error) {
      console.error("Error fetching timezones:", error);
      return [];
    }
  }
  return cachedTimezones;
}

// Day-of-week choices (Monday–Sunday, 0-based index with Monday=0)
function getDayChoices() {
  return DAYS.map((name, index) => ({
    name,
    value: name.toLowerCase(),
    index,
  }));
}

// Calculate days until the next occurrence of targetDay (0=Monday, 6=Sunday)
function getDaysUntilTarget(currentDay, targetDay) {
  const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
  return daysUntil;
}

// Map Luxon's weekday (1=Monday, 7=Sunday) to Monday-first index (0=Monday, 6=Sunday)
function mapLuxonWeekdayToIndex(luxonWeekday) {
  return (luxonWeekday - 1 + 7) % 7; // Convert 1-7 to 0-6
}

// Map Monday-first (0=Monday, 6=Sunday) to node-cron (0=Sunday, 1=Monday, ..., 6=Saturday)
function mapToCronDay(dayNumber) {
  if (dayNumber === "*") return "*";
  const dayIndex = parseInt(dayNumber);
  if (isNaN(dayIndex) || dayIndex < 0 || dayIndex > 6) {
    throw new Error(`Invalid dayNumber: ${dayNumber}`);
  }
  return (dayIndex === 6 ? 0 : dayIndex + 1).toString(); // Always return string
}

// Compare one-time alarms by execution time
function compareOneTimeAlarms(jobInfoA, jobInfoB) {
  const timeA = DateTime.fromISO(jobInfoA.details.executionTime);
  const timeB = DateTime.fromISO(jobInfoB.details.executionTime);
  return timeA.toMillis() - timeB.toMillis();
}

// Calculate next run time for recurring alarms
function calculateNextRecurringAlarmTime(jobInfo, now) {
  const [hours, minutes] = jobInfo.details.time.split(":");
  const targetDay = parseInt(jobInfo.details.dayNumber);
  if (isNaN(targetDay) || targetDay < 0 || targetDay >= DAYS.length) {
    return now;
  }
  let nextRun = DateTime.now()
    .setZone(jobInfo.details.timezone)
    .set({ hour: parseInt(hours), minute: parseInt(minutes), second: 0 });

  const currentDay = mapLuxonWeekdayToIndex(now.weekday);
  const daysUntilTarget = getDaysUntilTarget(currentDay, targetDay);
  if (nextRun < now || currentDay !== targetDay) {
    nextRun = nextRun.plus({ days: daysUntilTarget });
  }

  return nextRun;
}

// Get next occurrence for an alarm (one-time or recurring)
function getNextAlarmOccurrence(jobInfo, now) {
  if (jobInfo.details.dayNumber === "*") {
    return DateTime.fromISO(jobInfo.details.executionTime);
  }
  return calculateNextRecurringAlarmTime(jobInfo, now);
}

// Create comparator for sorting alarms by next occurrence
function createAlarmComparator() {
  return ([idA, jobInfoA], [idB, jobInfoB]) => {
    if (jobInfoA.details.dayNumber === "*" && jobInfoB.details.dayNumber === "*") {
      return compareOneTimeAlarms(jobInfoA, jobInfoB);
    }
    const now = DateTime.now().setZone(jobInfoA.details.timezone);
    const nextA = getNextAlarmOccurrence(jobInfoA, now);
    const nextB = getNextAlarmOccurrence(jobInfoB, now);
    return nextA.toMillis() - nextB.toMillis();
  };
}

// Format alarm timing (one-time or recurring)
function formatAlarmTiming(jobInfo) {
  const { time, dayNumber } = jobInfo.details;
  if (dayNumber === "*") {
    const executionTime = DateTime.fromISO(jobInfo.details.executionTime);
    return `once on ${executionTime.toFormat("MMMM d")} at ${time}`;
  }
  const targetDay = parseInt(dayNumber);
  if (isNaN(targetDay) || targetDay < 0 || targetDay >= DAYS.length) {
    return `every [Invalid Day] at ${time}`;
  }
  return `every ${DAYS[targetDay]} at ${time}`;
}

module.exports = {
  parseTime,
  getAllTimezones,
  getDayChoices,
  getDaysUntilTarget,
  mapLuxonWeekdayToIndex,
  mapToCronDay,
  compareOneTimeAlarms,
  calculateNextRecurringAlarmTime,
  getNextAlarmOccurrence,
  createAlarmComparator,
  formatAlarmTiming,
  DAYS,
};