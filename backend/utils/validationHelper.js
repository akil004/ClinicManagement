/**
 * validationHelper.js — small, dependency-free validators shared by every
 * controller. Consolidates the isValidEmail-style regexes that used to be
 * copy-pasted per controller.
 */
const EMAIL_RE = /^\S+@\S+\.\S+$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,15}$/;

const isValidEmail = (email) => typeof email === 'string' && EMAIL_RE.test(email.trim());
const isValidPhone = (phone) => typeof phone === 'string' && PHONE_RE.test(phone.trim());
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidObjectIdLike = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value);
const isPositiveNumber = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0;

export { isValidEmail, isValidPhone, isNonEmptyString, isValidObjectIdLike, isPositiveNumber };
