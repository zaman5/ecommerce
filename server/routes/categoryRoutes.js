import { Router } from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/', listCategories);
router.post('/', protect, restrictTo('admin'), createCategory);
router.put('/:id', protect, restrictTo('admin'), updateCategory);
router.delete('/:id', protect, restrictTo('admin'), deleteCategory);

export default router;
