import { Router } from 'express';
import {
  createShopManager,
  listShopManagers,
  getShopManager,
  updateShopManager,
  deleteShopManager,
} from '../controllers/shopManagerController.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = Router();

// All routes are admin-only — shop managers cannot manage other shop managers.
router.use(protect, restrictTo('admin'));

router.post('/', createShopManager);
router.get('/', listShopManagers);
router.get('/:id', getShopManager);
router.put('/:id', updateShopManager);
router.delete('/:id', deleteShopManager);

export default router;
