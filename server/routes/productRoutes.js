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

const router = Router();

// Admin + Shop Manager (scoped in the controller)
router.get('/admin/all', protect, restrictTo('admin', 'shopmanager'), adminListProducts);
router.post('/', protect, restrictTo('admin', 'shopmanager'), createProduct);
router.put('/:id', protect, restrictTo('admin', 'shopmanager'), updateProduct);
router.delete('/:id', protect, restrictTo('admin', 'shopmanager'), deleteProduct);

// Reviews (nested under a product slug) — keep above the catch-all `/:slug`
router.get('/:slug/reviews', listReviews);
router.post('/:slug/reviews', protect, upsertReview);

// Public
router.get('/', listProducts);
// Must stay above `/:slug`, or "colors" is read as a product slug.
router.get('/colors', listColors);
router.get('/:slug', getProduct);

export default router;
