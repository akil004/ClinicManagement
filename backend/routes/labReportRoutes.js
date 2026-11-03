import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../constants/roles.js';
import { getLabReports, createLabReport, updateLabReport, reviewLabReport } from '../controllers/labReportController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

router.get('/', getLabReports);
router.post('/', authorizeRoles(USER_ROLES.DOCTOR, USER_ROLES.ADMINISTRATOR), createLabReport);
router.put('/:id', authorizeRoles(USER_ROLES.DOCTOR, USER_ROLES.ADMINISTRATOR), updateLabReport);
router.put('/:id/review', authorizeRoles(USER_ROLES.DOCTOR), reviewLabReport);

export default router;
