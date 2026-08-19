import { Router } from 'express';
import {
  overview,
  salesTrend,
  topProducts,
  revenueByCategory,
  recommendations,
} from '../controllers/analyticsController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.use(protect, restrictTo('admin', 'shopmanager'));

router.get('/overview', overview);
router.get('/sales', salesTrend);
router.get('/top-products', topProducts);
router.get('/by-category', revenueByCategory);
router.get('/recommendations', recommendations);

export default router;
