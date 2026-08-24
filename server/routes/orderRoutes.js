import { Router } from 'express';
import {
  placeOrder,
  myOrders,
  getOrder,
  cancelOrder,
  lookupOrder,
  adminListOrders,
  updateOrderStatus,
  verifyPayment,
} from '../controllers/orderController.js';
import { protect, optionalAuth, restrictTo } from '../middleware/auth.js';
import { authenticatedRateLimiter, publicRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import {
  placeOrderSchema,
  lookupOrderSchema,
  updateOrderStatusSchema,
  verifyPaymentSchema,
} from '../validators/schemas.js';

const router = Router();

// Checkout — works signed-in or as a guest
router.post('/', optionalAuth, authenticatedRateLimiter, validateBody(placeOrderSchema), placeOrder);

// Guest order tracking (order number + email)
router.post('/lookup', publicRateLimiter, validateBody(lookupOrderSchema), lookupOrder);

// Client (account required)
router.get('/mine', protect, authenticatedRateLimiter, myOrders);

// Admin + Shop Manager (scoped in the controller)
router.get('/', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, adminListOrders);
router.put('/:id/status', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, validateBody(updateOrderStatusSchema), updateOrderStatus);
router.put('/:id/verify-payment', protect, restrictTo('admin', 'shopmanager'), authenticatedRateLimiter, validateBody(verifyPaymentSchema), verifyPayment);

// Owner, admin, or a guest holding the order's token
router.put('/:id/cancel', optionalAuth, authenticatedRateLimiter, cancelOrder);
router.get('/:id', optionalAuth, authenticatedRateLimiter, getOrder);

export default router;
