// Centralized constants — never repeat role/status/message string literals
// throughout components; import from here instead.

export const USER_ROLES = {
  ADMINISTRATOR: 'administrator',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
};

export const PATIENT_STATUS = {
  PENDING: 'pending',
  REGISTERED: 'registered',
  REJECTED: 'rejected',
};

export const APPOINTMENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  RESCHEDULED: 'rescheduled',
};

export const DOCTOR_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
};

export const MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Not authorized',
  REGISTRATION_SUCCESS: 'Patient registered successfully and is pending approval',
  REGISTRATION_APPROVED: 'Patient registration approved',
  REGISTRATION_REJECTED: 'Patient registration rejected',
  APPOINTMENT_CREATED: 'Appointment created successfully',
  APPOINTMENT_APPROVED: 'Appointment approved',
  APPOINTMENT_REJECTED: 'Appointment rejected',
  APPOINTMENT_CANCELLED: 'Appointment cancelled',
  PASSWORD_CHANGED: 'Password updated successfully',
  SERVER_ERROR: 'Something went wrong — please try again',
  VALIDATION_ERROR: 'Please check the submitted data and try again',
};
