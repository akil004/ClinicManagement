import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import { doctorControllers, receptionistControllers, getOnlineDoctors } from '../controllers/employeeController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

// ── Doctors ──────────────────────────────────────────────
// Listing/viewing is also available to receptionists so they can search,
// filter, and book appointments by specialization. All write operations
// (create/edit/disable/delete/reset password) are administrator-only.
//
// NOTE: /doctors/online-status must be registered before /doctors/:id so
// Express doesn't treat "online-status" as an :id value.
router.get('/doctors/online-status', authorizeRoles('administrator'), getOnlineDoctors);
router.get('/doctors',    authorizeRoles('administrator', 'receptionist'), doctorControllers.list);
router.get('/doctors/:id', authorizeRoles('administrator', 'receptionist'), doctorControllers.getOne);
router.post('/doctors',   authorizeRoles('administrator'), doctorControllers.create);
router.put('/doctors/:id', authorizeRoles('administrator'), doctorControllers.update);
router.patch('/doctors/:id/disable',        authorizeRoles('administrator'), doctorControllers.setActive);
router.patch('/doctors/:id/reset-password', authorizeRoles('administrator'), doctorControllers.resetPassword);
router.delete('/doctors/:id', authorizeRoles('administrator'), doctorControllers.remove);

// ── Receptionists ────────────────────────────────────────
// Administrator-only in every respect.
router.get('/receptionists',     authorizeRoles('administrator'), receptionistControllers.list);
router.get('/receptionists/:id', authorizeRoles('administrator'), receptionistControllers.getOne);
router.post('/receptionists',    authorizeRoles('administrator'), receptionistControllers.create);
router.put('/receptionists/:id', authorizeRoles('administrator'), receptionistControllers.update);
router.patch('/receptionists/:id/disable',        authorizeRoles('administrator'), receptionistControllers.setActive);
router.patch('/receptionists/:id/reset-password', authorizeRoles('administrator'), receptionistControllers.resetPassword);
router.delete('/receptionists/:id', authorizeRoles('administrator'), receptionistControllers.remove);

export default router;
