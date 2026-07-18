import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import {
  getAppointments, getAppointment, createAppointment,
  approveAppointment, rejectAppointment, completeAppointment,
  cancelAppointment, rescheduleAppointment, getAppointmentStats,
} from '../controllers/appointmentController.js';

const router = express.Router();

// All routes require authentication and a completed first-login password change
router.use(authenticateUser, blockIfMustChangePassword);

// Stats (admin only)
router.get('/stats', authorizeRoles('administrator'), getAppointmentStats);

// CRUD
router.get('/',    getAppointments);
router.get('/:id', getAppointment);
router.post('/',   authorizeRoles('receptionist', 'administrator'), createAppointment);

// Status transitions
router.patch('/:id/approve',    authorizeRoles('doctor'),                          approveAppointment);
router.patch('/:id/reject',     authorizeRoles('doctor'),                          rejectAppointment);
router.patch('/:id/complete',   authorizeRoles('doctor'),                          completeAppointment);
router.patch('/:id/cancel',     authorizeRoles('receptionist', 'administrator'),   cancelAppointment);
router.patch('/:id/reschedule', authorizeRoles('receptionist', 'administrator'),   rescheduleAppointment);

export default router;
