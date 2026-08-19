import { Router } from 'express';
import { getFlashSale, updateFlashSale } from '../controllers/flashSaleController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

// A singleton resource, so there is no :id and no POST — PUT edits the one row.
router.get('/', getFlashSale);
router.put('/', protect, restrictTo('admin'), updateFlashSale);

export default router;
