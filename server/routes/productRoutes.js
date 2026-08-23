import { Router } from 'express';
import {
  listProducts,
  listColors,
  getProduct,
  adminListProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { listReviews, upsertReview } from '../controllers/reviewController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Admin + Shop Manager (scoped in the controller)
router.get('/admin/all', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, adminListProducts);
router.post('/', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, createProduct);
router.put('/:id', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, updateProduct);
router.delete('/:id', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, deleteProduct);

// Reviews (nested under a product slug)
router.get('/:slug/reviews', publicRateLimiter, listReviews);
router.post('/:slug/reviews', protect, authenticatedRateLimiter, upsertReview);

// Public
router.get('/', publicRateLimiter, listProducts);
router.get('/colors', publicRateLimiter, listColors);
router.get('/:slug', publicRateLimiter, getProduct);

export default router;
