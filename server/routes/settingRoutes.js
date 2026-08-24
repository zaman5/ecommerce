import { Router } from 'express';
import {
  getJazzCash,
  updateJazzCash,
  getSocialSettings,
  updateSocialSettings,
  testSocialConnection,
} from '../controllers/settingController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { jazzCashSettingsSchema } from '../validators/schemas.js';

const router = Router();

// Public — checkout page reads these to show the JazzCash details
router.get('/jazzcash', publicRateLimiter, getJazzCash);

// Admin only — manage JazzCash phone + QR from the settings page
router.put('/jazzcash', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(jazzCashSettingsSchema), updateJazzCash);

// Admin only — manage Facebook & Instagram Social Integration settings
router.get('/social', protect, restrictTo('admin'), authenticatedRateLimiter, getSocialSettings);
router.put('/social', protect, restrictTo('admin'), authenticatedRateLimiter, updateSocialSettings);
router.post('/social/test', protect, restrictTo('admin'), authenticatedRateLimiter, testSocialConnection);

export default router;
