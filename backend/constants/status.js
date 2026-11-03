/**
 * status.js — kept as a backward-compatible barrel so existing
 * `import { X } from '../constants/status.js'` call sites keep working.
 * The canonical source of truth for each status group now lives in its
 * own file (patientStatus.js, appointmentStatus.js, billingStatus.js,
 * labReportStatus.js) per the project's constants convention.
 */
export * from './patientStatus.js';
export * from './appointmentStatus.js';
export * from './billingStatus.js';
export * from './labReportStatus.js';
export * from './documentTypes.js';

// ── Doctor online/offline status ────────────────────────────
export const DOCTOR_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};
export const DOCTOR_STATUS_VALUES = Object.values(DOCTOR_STATUS);

// ── Doctor clinical availability (distinct from online/offline) ────
export const AVAILABILITY_STATUS = {
  AVAILABLE: 'Available',
  BUSY: 'Busy',
  ON_LEAVE: 'On Leave',
};
export const AVAILABILITY_STATUSES = Object.values(AVAILABILITY_STATUS);

export const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];
