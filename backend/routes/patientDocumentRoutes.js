import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../constants/roles.js';
import { getDocuments, createDocument, deleteDocument } from '../controllers/patientDocumentController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

router.get('/', getDocuments);
router.post('/', authorizeRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.RECEPTIONIST, USER_ROLES.DOCTOR), createDocument);
router.delete('/:id', authorizeRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.RECEPTIONIST), deleteDocument);

export default router;
