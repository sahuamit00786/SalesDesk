/**
 * Dependency-free IANA timezone helpers (no date-fns-tz/luxon in this project). Used to
 * make digest scheduling honor the company's configured timezone instead of the server's
 * local time (§1.6 of the bug audit) — a company on IST configuring an 8am digest was
 * getting it at 8am server time, which is 1:30pm IST when the server runs in UTC.
 */

/** {year, month(0-based), day, hour, minute, second} as observed in `timeZone` at `date`. */
export function getZonedDateParts(date, timeZone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]))
    return {
      year: Number(parts.year),
      month: Number(parts.month) - 1,
      day: Number(parts.day),
      hour: Number(parts.hour) === 24 ? 0 : Number(parts.hour),
      minute: Number(parts.minute),
      second: Number(parts.second),
    }
  } catch {
    // Unknown/invalid IANA name — fail back to server-local rather than throwing.
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    }
  }
}

/** The real UTC instant corresponding to the given wall-clock date/time in `timeZone`. */
export function zonedTimeToUtc(year, month, day, hour, minute, second, timeZone) {
  const guess = Date.UTC(year, month, day, hour, minute, second)
  try {
    const observed = getZonedDateParts(new Date(guess), timeZone)
    const observedAsUtc = Date.UTC(observed.year, observed.month, observed.day, observed.hour, observed.minute, observed.second)
    const offsetMs = observedAsUtc - guess
    return new Date(guess - offsetMs)
  } catch {
    return new Date(guess)
  }
}

/** True if it's currently `hour:minute` (wall clock) in `timeZone`, as of `now`. */
export function isCurrentlyClockTime(now, hour, minute, timeZone) {
  const parts = getZonedDateParts(now, timeZone)
  return parts.hour === hour && parts.minute === minute
}

/** [startOfDayUtc, endOfDayUtc] for "today" as observed in `timeZone`, at `now`. */
export function zonedDayBounds(now, timeZone) {
  const { year, month, day } = getZonedDateParts(now, timeZone)
  const start = zonedTimeToUtc(year, month, day, 0, 0, 0, timeZone)
  const end = zonedTimeToUtc(year, month, day, 23, 59, 59, timeZone)
  return { start, end }
}
