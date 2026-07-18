import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import {
  getMedicalRecords, getPatientHistory,
  createMedicalRecord, updateMedicalRecord,
} from '../controllers/medicalRecordController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

router.get('/',                           getMedicalRecords);
router.get('/patient/:patientPhone',      getPatientHistory);
router.post('/',    authorizeRoles('doctor', 'administrator'), createMedicalRecord);
router.put('/:id',  authorizeRoles('doctor', 'administrator'), updateMedicalRecord);

export default router;
