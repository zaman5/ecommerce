import { Router } from 'express';
import {
  listProducts,
  listColors,
  getProduct,
  adminListProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  shareProductSocial,
} from '../controllers/productController.js';
import { listReviews, upsertReview } from '../controllers/reviewController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody, validateQuery } from '../middleware/validator.js';
import { productSchema, updateProductSchema, shareProductSocialSchema, reviewSchema, listProductsQuerySchema } from '../validators/schemas.js';

const router = Router();

// Admin + Shop Manager (scoped in the controller)
router.get('/admin/all', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, adminListProducts);
router.post('/', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, validateBody(productSchema), createProduct);
router.put('/:id', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, validateBody(updateProductSchema), updateProduct);
router.delete('/:id', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, deleteProduct);
router.post('/:id/share-social', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, validateBody(shareProductSocialSchema), shareProductSocial);

// Reviews (nested under a product slug)
router.get('/:slug/reviews', publicRateLimiter, listReviews);
router.post('/:slug/reviews', protect, authenticatedRateLimiter, validateBody(reviewSchema), upsertReview);

// Public
router.get('/', publicRateLimiter, validateQuery(listProductsQuerySchema), listProducts);
router.get('/colors', publicRateLimiter, listColors);
router.get('/:slug', publicRateLimiter, getProduct);

export default router;
