import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import { USER_ROLES } from '../constants/roles.js';
import { getBills, createBill, updateBill } from '../controllers/billingController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

router.get('/', getBills);
router.post('/', authorizeRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.RECEPTIONIST), createBill);
router.put('/:id', authorizeRoles(USER_ROLES.ADMINISTRATOR, USER_ROLES.RECEPTIONIST), updateBill);

export default router;
