import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { categorySchema } from '../validators/schemas.js';

const router = Router();

router.get('/', publicRateLimiter, listCategories);
router.post('/', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(categorySchema), createCategory);
router.put('/:id', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(categorySchema), updateCategory);
router.delete('/:id', protect, restrictTo('admin'), authenticatedRateLimiter, deleteCategory);

export default router;
