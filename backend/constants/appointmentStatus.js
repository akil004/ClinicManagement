/**
 * appointmentStatus.js — canonical source for appointment status & rejection types.
 */
export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
};
export const APPOINTMENT_STATUS_VALUES = Object.values(APPOINTMENT_STATUS);

export const REJECTION_REASON_TYPES = [
  'Patient not eligible for treatment',
  'Incomplete medical information',
  'Appointment booked incorrectly',
  'Specialist unavailable',
  'Duplicate appointment',
  'Medical contraindication',
  'Patient requested cancellation',
  'Other',
];
