// dateHelper.js — single source of truth for date/time formatting and
// comparison on the frontend. Do not format or compare dates ad-hoc inside
// components; import these helpers instead. Calendar-day comparisons use
// 'YYYY-MM-DD' strings resolved in the app timezone, matching the backend's
// dateHelper.js exactly, which avoids UTC/local off-by-one-day bugs.

const TZ = import.meta.env.VITE_APP_TIMEZONE ?? 'Asia/Kolkata';

const todayDateOnly = () => toDateOnlyString(new Date());

/** Converts a Date/ISO-string/'YYYY-MM-DD' into a 'YYYY-MM-DD' string (app timezone). */
export const toDateOnlyString = (input) => {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date);
};

/** 'YYYY-MM-DD' string for today, suitable for an <input type="date" min="..."> */
export const todayInputValue = () => todayDateOnly();

export const isValidDate = (input) => {
  const date = input instanceof Date ? input : new Date(input);
  return !Number.isNaN(date.getTime());
};

export const isPastDate = (input) => {
  const d = toDateOnlyString(input);
  return d ? d < todayDateOnly() : false;
};

export const isFutureDate = (input) => {
  const d = toDateOnlyString(input);
  return d ? d > todayDateOnly() : false;
};

export const isToday = (input) => toDateOnlyString(input) === todayDateOnly();

/** Human-readable date, e.g. "18 Aug 2026". */
export const formatDate = (input) => {
  if (!input) return '—';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
  }).format(date);
};

/** Human-readable date + time, e.g. "18 Aug 2026, 10:30 AM". */
export const formatDateTime = (input) => {
  if (!input) return '—';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
};

/** Formats an 'HH:mm' time-slot string as '10:30 AM'. */
export const formatTime = (timeSlot) => {
  if (!timeSlot) return '—';
  const match = /^(\d{1,2}):(\d{2})/.exec(timeSlot);
  if (!match) return timeSlot;
  let [, h, m] = match;
  h = Number(h);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${suffix}`;
};

/** Parses a 'YYYY-MM-DD' string into a Date at UTC midnight (matches backend parseDateOnly). */
export const parseDateOnly = (dateStr) => {
  if (!dateStr) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr));
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
};

export default {
  toDateOnlyString, todayInputValue, isValidDate, isPastDate, isFutureDate,
  isToday, formatDate, formatDateTime, formatTime, parseDateOnly,
};
