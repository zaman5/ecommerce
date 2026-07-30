import { Router } from 'express';
import {
  placeOrder,
  myOrders,
  getOrder,
  cancelOrder,
  lookupOrder,
  adminListOrders,
  updateOrderStatus,
} from '../controllers/orderController.js';
import { protect, optionalAuth, restrictTo } from '../middleware/auth.js';

const router = Router();

// Checkout — works signed-in or as a guest
router.post('/', optionalAuth, placeOrder);

// Guest order tracking (order number + email)
router.post('/lookup', lookupOrder);

// Client (account required)
router.get('/mine', protect, myOrders);

// Admin
router.get('/', protect, restrictTo('admin'), adminListOrders);
router.put('/:id/status', protect, restrictTo('admin'), updateOrderStatus);

// Owner, admin, or a guest holding the order's token — keep after the
// specific routes above so `/mine` and `/lookup` aren't swallowed by `/:id`.
router.put('/:id/cancel', optionalAuth, cancelOrder);
router.get('/:id', optionalAuth, getOrder);

export default router;
