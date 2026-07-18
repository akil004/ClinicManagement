import express from 'express';
import { authenticateUser, authorizeRoles, blockIfMustChangePassword } from '../middleware/authMiddleware.js';
import {
  getSpecializations, createSpecialization, updateSpecialization, deleteSpecialization,
} from '../controllers/specializationController.js';

const router = express.Router();

router.use(authenticateUser, blockIfMustChangePassword);

router.get('/', getSpecializations); // any authenticated role — needed for doctor forms & booking wizard

router.post('/',    authorizeRoles('administrator'), createSpecialization);
router.put('/:id',  authorizeRoles('administrator'), updateSpecialization);
router.delete('/:id', authorizeRoles('administrator'), deleteSpecialization);

export default router;
