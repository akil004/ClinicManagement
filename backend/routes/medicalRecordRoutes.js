import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../constants/roles.js';
import { getMedicalRecords, createMedicalRecord, updateMedicalRecord } from '../controllers/medicalRecordController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

// Any authenticated role may read (doctors need it for patient history;
// administrator/receptionist may need it for reporting/history views).
router.get('/', getMedicalRecords);

router.post('/', authorizeRoles(USER_ROLES.DOCTOR), createMedicalRecord);
router.put('/:id', authorizeRoles(USER_ROLES.DOCTOR), updateMedicalRecord);

export default router;
