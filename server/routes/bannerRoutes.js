import { Router } from 'express';
import {
  listBanners,
  listAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/bannerController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody, validateParams } from '../middleware/validator.js';
import { bannerSchema, idParamSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', publicRateLimiter, listBanners);
router.get('/admin/all', protect, restrictTo('admin'), authenticatedRateLimiter, listAllBanners);
router.post('/', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(bannerSchema), createBanner);
router.put('/:id', protect, restrictTo('admin'), authenticatedRateLimiter, validateParams(idParamSchema), validateBody(bannerSchema), updateBanner);
router.delete('/:id', protect, restrictTo('admin'), authenticatedRateLimiter, validateParams(idParamSchema), deleteBanner);

export default router;
