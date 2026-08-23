import { Router } from 'express';
import { getFlashSale, updateFlashSale } from '../controllers/flashSaleController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.get('/', publicRateLimiter, getFlashSale);
router.put('/', protect, restrictTo('admin'), authenticatedRateLimiter, updateFlashSale);

export default router;
