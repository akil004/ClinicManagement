import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import { getAdminDashboard, getDoctorDashboard, getReceptionDashboard } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

router.get('/admin',     authorizeRoles('administrator'), getAdminDashboard);
router.get('/doctor',    authorizeRoles('doctor'),        getDoctorDashboard);
router.get('/reception', authorizeRoles('receptionist'),  getReceptionDashboard);

export default router;
