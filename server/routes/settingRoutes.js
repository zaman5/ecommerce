import { Router } from 'express';
import { getJazzCash, updateJazzCash } from '../controllers/settingController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public — checkout page reads these to show the JazzCash details
router.get('/jazzcash', publicRateLimiter, getJazzCash);

// Admin only — manage JazzCash phone + QR from the settings page
router.put('/jazzcash', protect, restrictTo('admin'), authenticatedRateLimiter, updateJazzCash);

export default router;
