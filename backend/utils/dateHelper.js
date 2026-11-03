/**
 * dateHelper.js — single source of truth for every date/time operation on
 * the backend. Do NOT format, parse, or compare dates ad-hoc elsewhere;
 * import these helpers instead. All "calendar day" comparisons are done as
 * YYYY-MM-DD strings resolved in the application's configured timezone
 * (APP_TIMEZONE), which avoids the classic UTC/local off-by-one-day bug.
 */
import { config } from '../config/env.js';

const TZ = config.appTimezone;

/** Returns today's calendar date as 'YYYY-MM-DD' in the app timezone. */
const todayDateOnly = () => toDateOnlyString(new Date());

/**
 * Converts a Date, ISO string, or 'YYYY-MM-DD' string into a 'YYYY-MM-DD'
 * string, resolved in the app timezone.
 */
const toDateOnlyString = (input) => {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  // en-CA locale formats as YYYY-MM-DD, which is exactly what we want.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
};

/**
 * Parses a 'YYYY-MM-DD' date-only string into a Date object representing
 * UTC midnight of that calendar day. Storing appointment dates this way
 * (calendar day + separate timeSlot string) means the stored value never
 * shifts by a day regardless of server or client timezone.
 */
const parseDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!match) {
    const fallback = new Date(dateStr);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
};

/** True if the given date/date-string is a valid, parseable date. */
const isValidDate = (input) => {
  const date = input instanceof Date ? input : new Date(input);
  return !Number.isNaN(date.getTime());
};

/** True if dateInput's calendar day is strictly before today (app timezone). */
const isPastDate = (dateInput) => {
  const d = toDateOnlyString(dateInput);
  if (!d) return false;
  return d < todayDateOnly();
};

/** True if dateInput's calendar day is strictly after today (app timezone). */
const isFutureDate = (dateInput) => {
  const d = toDateOnlyString(dateInput);
  if (!d) return false;
  return d > todayDateOnly();
};

/** True if dateInput falls on today's calendar day (app timezone). */
const isToday = (dateInput) => toDateOnlyString(dateInput) === todayDateOnly();

/** Human-readable date, e.g. "18 Aug 2026", in the app timezone. */
const formatDate = (dateInput) => {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
};

/** Human-readable date + time, e.g. "18 Aug 2026, 10:30 AM", in the app timezone. */
const formatDateTime = (dateInput) => {
  if (!dateInput) return '—';
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
};

/** Formats a 'HH:mm' time-slot string as '10:30 AM'. Passes through if unparsable. */
const formatTime = (timeSlot) => {
  if (!timeSlot) return '—';
  const match = /^(\d{1,2}):(\d{2})/.exec(timeSlot);
  if (!match) return timeSlot;
  let [, h, m] = match;
  h = Number(h);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
};

/** Start of the given calendar day (UTC midnight of that day) as a Date. */
const startOfDay = (dateInput) => parseDateOnly(toDateOnlyString(dateInput));

/** End of the given calendar day (23:59:59.999 UTC of that day) as a Date. */
const endOfDay = (dateInput) => {
  const start = startOfDay(dateInput);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
};

/** Mongo range query helper: { $gte, $lte } spanning the given calendar day. */
const dayRangeQuery = (dateInput) => ({ $gte: startOfDay(dateInput), $lte: endOfDay(dateInput) });

/** Compares two 'HH:mm' time-slot strings for chronological sorting. */
const compareTimeSlots = (a = '', b = '') => a.localeCompare(b);

export {
  TZ as APP_TIMEZONE,
  todayDateOnly,
  toDateOnlyString,
  parseDateOnly,
  isValidDate,
  isPastDate,
  isFutureDate,
  isToday,
  formatDate,
  formatDateTime,
  formatTime,
  startOfDay,
  endOfDay,
  dayRangeQuery,
  compareTimeSlots,
};
