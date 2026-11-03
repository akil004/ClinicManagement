/**
 * roles.js — centralized user-role constants.
 * Never hard-code role strings ("administrator" | "doctor" | "receptionist")
 * anywhere else in the codebase — import USER_ROLES from here instead.
 */
export const USER_ROLES = {
  ADMINISTRATOR: 'administrator',
  DOCTOR: 'doctor',
  RECEPTIONIST: 'receptionist',
};

export const USER_ROLE_VALUES = Object.values(USER_ROLES);

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMINISTRATOR]: 'Administrator',
  [USER_ROLES.DOCTOR]: 'Doctor',
  [USER_ROLES.RECEPTIONIST]: 'Receptionist',
};

export default USER_ROLES;
