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

const router = Router();

router.get('/', publicRateLimiter, listBanners);
router.get('/admin/all', protect, restrictTo('admin'), authenticatedRateLimiter, listAllBanners);
router.post('/', protect, restrictTo('admin'), authenticatedRateLimiter, createBanner);
router.put('/:id', protect, restrictTo('admin'), authenticatedRateLimiter, updateBanner);
router.delete('/:id', protect, restrictTo('admin'), authenticatedRateLimiter, deleteBanner);

export default router;
