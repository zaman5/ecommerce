import { Router } from 'express';
import { getJazzCash, updateJazzCash } from '../controllers/settingController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

// Public — checkout page reads these to show the JazzCash details
router.get('/jazzcash', getJazzCash);

// Admin only — manage JazzCash phone + QR from the settings page
router.put('/jazzcash', protect, restrictTo('admin'), updateJazzCash);

export default router;
