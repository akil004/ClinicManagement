/**
 * ageHelper.js — dateOfBirth is the source of truth for a patient's age.
 * The stored `age` field (if present) is a cache for fast display/search;
 * always recompute it from dateOfBirth when one is available.
 */

/** calculateAge(dateOfBirth) — whole years as of today, or null if invalid/absent. */
const calculateAge = (dateOfBirth) => {
  if (!dateOfBirth) return null;
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
};

export { calculateAge };
