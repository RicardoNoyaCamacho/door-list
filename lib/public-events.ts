export type PublicEvent = {
  id: string;
  title: string;
  description: string;
  starts_at: string;
  venue: string;
};

export const eventTimeZone = "America/Mexico_City";

// Resolve local midnight independently of the server's timezone, evaluating
// the offset at midnight rather than assuming the offset at `now`.
export function registrationDayStart(now = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: eventTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  });
  const parts = (date: Date) => Object.fromEntries(
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
