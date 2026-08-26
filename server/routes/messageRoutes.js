import { Router } from 'express';
import {
  createMessage,
  listMessages,
  updateMessage,
  deleteMessage,
} from '../controllers/messageController.js';
import { protect, restrictTo, optionalAuth } from '../middleware/auth.js';
import { publicRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { messageSchema, updateMessageSchema } from '../validators/schemas.js';

const router = Router();

router.post('/', optionalAuth, publicRateLimiter, validateBody(messageSchema), createMessage);
router.get('/', protect, restrictTo('admin'), authenticatedRateLimiter, listMessages);
router.put('/:id', protect, restrictTo('admin'), authenticatedRateLimiter, validateBody(updateMessageSchema), updateMessage);
router.delete('/:id', protect, restrictTo('admin'), authenticatedRateLimiter, deleteMessage);

export default router;
