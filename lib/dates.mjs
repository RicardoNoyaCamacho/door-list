export const eventTimeZone = "America/Mexico_City";

/** Format a calendar date without shifting it to the previous day. @param {string} value */
export function formatChartDate(value) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

/** @param {string} value */
export function formatEventDate(value) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: eventTimeZone, dateStyle: "long", timeStyle: "short",
  }).format(new Date(value));
}

/** @param {string} value */
export function formatEmailDate(value) {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: eventTimeZone, dateStyle: "full", timeStyle: "short", hourCycle: "h23",
  }).format(new Date(value));
}

/** @param {Date} value */
function localParts(value) {
  return Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone: eventTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(value).map(({ type, value }) => [type, value]));
}

/** @param {string} value */
export function localDateTime(value) {
  const p = localParts(new Date(value));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** @param {string} value */
export function eventDateTimeToIso(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Invalid event date");
  const wallTime = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wallTime)) throw new Error("Invalid event date");
  let instant = wallTime;
  for (let attempt = 0; attempt < 4; attempt++) {
    const atInstant = Date.parse(`${localDateTime(new Date(instant).toISOString())}:00Z`);
    const corrected = instant + wallTime - atInstant;
    if (corrected === instant) break;
    instant = corrected;
  }
  const result = new Date(instant).toISOString();
  if (localDateTime(result) !== value) throw new Error("Invalid event date");
  return result;
}

// Resolve local midnight independently of the server's timezone, evaluating
// the offset at midnight rather than assuming the offset at `now`.
export function registrationDayStart(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: eventTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const parts = (date) => Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  );
  const local = parts(now);
  const midnight = Date.UTC(Number(local.year), Number(local.month) - 1, Number(local.day));
  let instant = midnight;
  for (let attempt = 0; attempt < 3; attempt++) {
    const atInstant = parts(new Date(instant));
    const wallClock = Date.UTC(
      Number(atInstant.year), Number(atInstant.month) - 1, Number(atInstant.day),
      Number(atInstant.hour), Number(atInstant.minute), Number(atInstant.second),
    );
    const corrected = instant + midnight - wallClock;
    if (corrected === instant) break;
    instant = corrected;
  }
  return new Date(instant).toISOString();
}
