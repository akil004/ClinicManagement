import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../constants/roles.js';
import {
  getPrescriptions, getPrescription, createPrescription, updatePrescription,
} from '../controllers/prescriptionController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

router.get('/', getPrescriptions);
router.get('/:id', getPrescription);
router.post('/', authorizeRoles(USER_ROLES.DOCTOR), createPrescription);
router.put('/:id', authorizeRoles(USER_ROLES.DOCTOR), updatePrescription);

export default router;
