/**
 * messages.js — centralized user-facing response messages.
 * Import MESSAGES instead of repeating literal strings throughout
 * controllers.
 */
export const MESSAGES = {
  // ── Auth ──
  LOGIN_SUCCESS: 'Login successful',
  LOGIN_FAILED: 'Login failed. Please try again.',
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Not authorized',
  ACCOUNT_DISABLED: 'This account has been disabled. Contact the administrator.',
  MUST_CHANGE_PASSWORD: 'You must change your temporary password before continuing',
  PASSWORD_CHANGED: 'Password updated successfully',
  LOGOUT_SUCCESS: 'Logged out successfully',

  // ── Patient registration ──
  REGISTRATION_SUCCESS: 'Patient registered successfully and is pending approval',
  REGISTRATION_APPROVED: 'Patient registration approved',
  REGISTRATION_REJECTED: 'Patient registration rejected',
  REGISTRATION_NOT_FOUND: 'Patient registration not found',
  PATIENT_NOT_REGISTERED: 'This patient is not yet registered. Approve their registration before booking an appointment.',
  PATIENT_ALREADY_PROCESSED: 'This registration has already been processed',

  // ── Appointments ──
  APPOINTMENT_CREATED: 'Appointment created successfully',
  APPOINTMENT_APPROVED: 'Appointment approved',
  APPOINTMENT_REJECTED: 'Appointment rejected',
  APPOINTMENT_CANCELLED: 'Appointment cancelled',
  APPOINTMENT_COMPLETED: 'Appointment marked as completed',
  APPOINTMENT_RESCHEDULED: 'Appointment rescheduled',
  APPOINTMENT_NOT_FOUND: 'Appointment not found',
  APPOINTMENT_PAST_DATE: 'Cannot book an appointment in the past',

  // ── Medical records / prescriptions / lab reports / billing ──
  MEDICAL_RECORD_CREATED: 'Medical record saved',
  MEDICAL_RECORD_NOT_FOUND: 'Medical record not found',
  PRESCRIPTION_CREATED: 'Prescription saved',
  PRESCRIPTION_NOT_FOUND: 'Prescription not found',
  LAB_REPORT_CREATED: 'Lab report saved',
  LAB_REPORT_NOT_FOUND: 'Lab report not found',
  DOCUMENT_UPLOADED: 'Document saved',
  DOCUMENT_NOT_FOUND: 'Document not found',
  BILL_CREATED: 'Bill generated',
  BILL_UPDATED: 'Bill updated',
  BILL_NOT_FOUND: 'Bill not found',

  // ── Generic ──
  SERVER_ERROR: 'Server error — please try again later',
  VALIDATION_ERROR: 'Please check the submitted data and try again',
  NOT_FOUND: 'Resource not found',
  FORBIDDEN: 'You do not have permission to perform this action',
};

export default MESSAGES;
