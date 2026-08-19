import { Router } from 'express';
import {
  listBanners,
  listAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from '../controllers/bannerController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

router.get('/', listBanners);
// Before '/:id' would matter if a GET-one route existed; kept above the
// parameterised routes anyway so adding one later can't shadow it.
router.get('/admin/all', protect, restrictTo('admin'), listAllBanners);
router.post('/', protect, restrictTo('admin'), createBanner);
router.put('/:id', protect, restrictTo('admin'), updateBanner);
router.delete('/:id', protect, restrictTo('admin'), deleteBanner);

export default router;
