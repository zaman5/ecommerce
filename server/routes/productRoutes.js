import { Router } from 'express';
import {
  listProducts,
  getProduct,
  adminListProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { listReviews, upsertReview } from '../controllers/reviewController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

// Admin
router.get('/admin/all', protect, restrictTo('admin'), adminListProducts);
router.post('/', protect, restrictTo('admin'), createProduct);
router.put('/:id', protect, restrictTo('admin'), updateProduct);
router.delete('/:id', protect, restrictTo('admin'), deleteProduct);

// Reviews (nested under a product slug) — keep above the catch-all `/:slug`
router.get('/:slug/reviews', listReviews);
router.post('/:slug/reviews', protect, upsertReview);

// Public
router.get('/', listProducts);
router.get('/:slug', getProduct);

export default router;
