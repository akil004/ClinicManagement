import express from 'express';
import { login, logout, heartbeat, getMe, changePassword } from '../controllers/authController.js';
import { authenticateUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public — the only public auth endpoint. There is no public sign-up;
// Administrator, Doctor, and Receptionist accounts are provisioned by an
// administrator (or seeded directly for the first administrator).
router.post('/login', login);

// Authenticated — used both for the forced first-login change and
// voluntary password changes. Intentionally NOT gated behind
// blockIfMustChangePassword, since it's the escape hatch for that gate.
router.post('/change-password', authenticateUser, changePassword);

// Authenticated — fetch the current user's own profile.
router.get('/me', authenticateUser, getMe);

// Authenticated — marks a doctor offline immediately on logout.
router.post('/logout', authenticateUser, logout);

// Authenticated — periodic "still using the app" ping from the doctor
// dashboard, used to compute real online/offline status (see
// DOCTOR_ONLINE_TIMEOUT_MINUTES).
router.post('/heartbeat', authenticateUser, heartbeat);

export default router;
