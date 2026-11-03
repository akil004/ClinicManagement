import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';
import { USER_ROLES } from '../constants/roles.js';
import { MESSAGES } from '../constants/messages.js';
import { sendSuccess, sendError, asyncHandler } from '../utils/responseHelper.js';

const isValidEmail = (email) => /^\S+@\S+\.\S+$/.test(email);

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });

const publicUser = (user) => ({
  id:                 user._id,
  name:               user.fullName,
  email:              user.email,
  role:               user.role,
  mustChangePassword: user.mustChangePassword,
});

// NOTE: There is no public registration endpoint. Administrator accounts are
// seeded directly into the database (see backend/seed/seedAdmin.js), and
// doctor/receptionist accounts can only be created by an administrator via
// the Employee Management APIs (see employeeController.js).

// @route  POST /api/auth/login
// @access Public
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, { status: 400, message: 'Email and password are required' });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return sendError(res, { status: 401, message: MESSAGES.INVALID_CREDENTIALS });

  if (!user.isActive) {
    return sendError(res, { status: 403, message: MESSAGES.ACCOUNT_DISABLED });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return sendError(res, { status: 401, message: MESSAGES.INVALID_CREDENTIALS });

  const token = generateToken(user);

  // Doctor online/offline presence is driven by real login activity.
  if (user.role === USER_ROLES.DOCTOR) {
    const now = new Date();
    user.isOnline = true;
    user.lastLoginAt = now;
    user.lastActiveAt = now;
    await user.save();
  }

  return sendSuccess(res, {
    message: MESSAGES.LOGIN_SUCCESS,
    data: { token, user: publicUser(user) },
  });
}, MESSAGES.LOGIN_FAILED);

// @route  POST /api/auth/logout
// @access Authenticated
// Marks a doctor offline immediately rather than waiting for the inactivity
// sweep. Harmless no-op for non-doctor roles.
const logout = asyncHandler(async (req, res) => {
  if (req.user.role === USER_ROLES.DOCTOR) {
    req.user.isOnline = false;
    await req.user.save();
  }
  return sendSuccess(res, { message: MESSAGES.LOGOUT_SUCCESS });
}, 'Could not log out');

// @route  POST /api/auth/heartbeat
// @access Authenticated (doctor)
// Called periodically by the doctor's dashboard while the tab is open, to
// keep lastActiveAt (and therefore online status) current. See
// DOCTOR_ONLINE_TIMEOUT_MINUTES / the sweep in server.js for the other side
// of this — doctors who stop sending heartbeats are auto-marked offline.
const heartbeat = asyncHandler(async (req, res) => {
  if (req.user.role !== USER_ROLES.DOCTOR) {
    return sendSuccess(res, { message: 'ok' });
  }
  const now = new Date();
  req.user.isOnline = true;
  req.user.lastActiveAt = now;
  await req.user.save();
  return sendSuccess(res, { message: 'ok', data: { lastActiveAt: now } });
}, 'Could not record activity');

// @route  GET /api/auth/me
// @access Authenticated
const getMe = asyncHandler(async (req, res) => {
  const extra = req.user.role === USER_ROLES.DOCTOR
    ? {
        department: req.user.department,
        specialization: req.user.specialization,
        qualification: req.user.qualification,
        experience: req.user.experience,
        consultationFee: req.user.consultationFee,
        availabilityStatus: req.user.availabilityStatus,
        isOnline: req.user.isOnline,
        lastActiveAt: req.user.lastActiveAt,
      }
    : {};
  return sendSuccess(res, { data: { user: { ...publicUser(req.user), phone: req.user.phone, ...extra } } });
}, 'Could not load profile');

// @route  POST /api/auth/change-password
// @access Authenticated
// @body   { currentPassword, newPassword, confirmNewPassword }
// Used both for the mandatory first-login password change (temporary
// password issued by the administrator) and for voluntary password changes.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return sendError(res, { status: 400, message: 'All fields are required' });
  }
  if (newPassword.length < 6) {
    return sendError(res, { status: 400, message: 'New password must be at least 6 characters' });
  }
  if (newPassword !== confirmNewPassword) {
    return sendError(res, { status: 400, message: 'New passwords do not match' });
  }

  const user = await User.findById(req.user._id);
  if (!user) return sendError(res, { status: 404, message: 'User not found' });

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return sendError(res, { status: 401, message: 'Current password is incorrect' });

  user.password = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  await user.save();

  return sendSuccess(res, { message: MESSAGES.PASSWORD_CHANGED, data: { user: publicUser(user) } });
}, 'Could not update password');

export {
  login, logout, heartbeat, getMe, changePassword,
  isValidEmail, generateToken, publicUser,
};
