import { Router } from 'express';
import {
  createShopManager,
  listShopManagers,
  getShopManager,
  updateShopManager,
  deleteShopManager,
} from '../controllers/shopManagerController.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { shopManagerCreateSchema, shopManagerUpdateSchema } from '../validators/schemas.js';

const router = Router();

// All routes are admin-only — shop managers cannot manage other shop managers.
router.use(protect, restrictTo('admin'), authenticatedRateLimiter);

router.post('/', validateBody(shopManagerCreateSchema), createShopManager);
router.get('/', listShopManagers);
router.get('/:id', getShopManager);
router.put('/:id', validateBody(shopManagerUpdateSchema), updateShopManager);
router.delete('/:id', deleteShopManager);

export default router;
