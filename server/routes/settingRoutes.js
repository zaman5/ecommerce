import { Router } from 'express';
import {
  getPublicSettings,
  updateGeneralSettings,
  getContactSettings,
  updateContactSettings,
  getJazzCash,
  updateJazzCash,
  getSocialSettings,
  updateSocialSettings,
  testSocialConnection,
} from '../controllers/settingController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import {
  jazzCashSettingsSchema,
  contactSettingsSchema,
  generalSettingsSchema,
  socialSettingsSchema,
} from '../validators/schemas.js';

const router = Router();

// Public — site branding, UAN & payment info
router.get('/public', publicRateLimiter, getPublicSettings);

// Public & Admin — contact info & UAN
router.get('/contact', publicRateLimiter, getContactSettings);
router.put('/contact', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(contactSettingsSchema), updateContactSettings);

// Admin only — manage site branding
router.put('/general', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(generalSettingsSchema), updateGeneralSettings);

// Public — checkout page reads these to show the JazzCash details
router.get('/jazzcash', publicRateLimiter, getJazzCash);

// Admin only — manage JazzCash phone + QR from the settings page
router.put('/jazzcash', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(jazzCashSettingsSchema), updateJazzCash);

// Admin only — manage Facebook & Instagram Social Integration settings
router.get('/social', protect, restrictTo('admin'), authenticatedRateLimiter, getSocialSettings);
router.put('/social', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(socialSettingsSchema), updateSocialSettings);
router.post('/social/test', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(socialSettingsSchema), testSocialConnection);

export default router;
