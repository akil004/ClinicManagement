import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';

/**
 * authenticateUser — verifies the Bearer JWT and attaches req.user
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Not authorized — no token provided' });
    }

    const token    = authHeader.split(' ')[1];
    const decoded  = jwt.verify(token, config.jwtSecret);
    const user     = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Not authorized — user no longer exists' });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: 'This account has been disabled. Contact the administrator.' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Not authorized — invalid or expired token' });
  }
};

/**
 * authorizeRoles(...roles) — restrict to one or more roles.
 * Must be used after authenticateUser.
 *
 * Example:
 *   router.patch('/reject', authenticateUser, authorizeRoles('doctor'), rejectAppointment);
 */
const authorizeRoles = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      message: `Access denied — requires role: ${allowedRoles.join(' or ')}`,
    });
  }
  next();
};

/**
 * blockIfMustChangePassword — prevents access to any dashboard/data route
 * until a doctor or receptionist logging in with a temporary password has
 * changed it. Must be used after authenticateUser.
 */
const blockIfMustChangePassword = (req, res, next) => {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({
      message: 'You must change your temporary password before continuing',
      mustChangePassword: true,
    });
  }
  next();
};

// Alias kept for backward compat
const protect = authenticateUser;

export { authenticateUser, protect, authorizeRoles, blockIfMustChangePassword };
