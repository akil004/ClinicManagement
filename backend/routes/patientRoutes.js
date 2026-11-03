import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../constants/roles.js';
import {
  createPatient, getPendingPatients, getRegisteredPatients, getRejectedPatients,
  getPatient, updatePatient, approvePatient, rejectPatient, searchRegisteredPatients,
} from '../controllers/patientController.js';
import { getPatientHistory } from '../controllers/patientHistoryController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

const REGISTRARS = [USER_ROLES.ADMINISTRATOR, USER_ROLES.RECEPTIONIST];

// Registration lists — kept as separate endpoints from appointments entirely.
router.get('/pending',    authorizeRoles(...REGISTRARS), getPendingPatients);
router.get('/registered', authorizeRoles(...REGISTRARS, USER_ROLES.DOCTOR), getRegisteredPatients);
router.get('/rejected',   authorizeRoles(...REGISTRARS), getRejectedPatients);
router.get('/search',     authorizeRoles(...REGISTRARS, USER_ROLES.DOCTOR), searchRegisteredPatients);

router.get('/:id',   authorizeRoles(...REGISTRARS, USER_ROLES.DOCTOR), getPatient);
router.get('/:id/history', authorizeRoles(...REGISTRARS, USER_ROLES.DOCTOR), getPatientHistory);
router.post('/',     authorizeRoles(...REGISTRARS), createPatient);
router.put('/:id',   authorizeRoles(...REGISTRARS), updatePatient);

router.put('/:id/approve', authorizeRoles(...REGISTRARS), approvePatient);
router.put('/:id/reject',  authorizeRoles(...REGISTRARS), rejectPatient);

export default router;
