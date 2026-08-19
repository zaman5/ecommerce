import { Router } from 'express';
import {
  createMessage,
  listMessages,
  updateMessage,
  deleteMessage,
} from '../controllers/messageController.js';
import { protect, restrictTo, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Public. optionalAuth so a signed-in customer's message is tagged with their
// account, while a guest can still write.
router.post('/', optionalAuth, createMessage);

router.get('/', protect, restrictTo('admin'), listMessages);
router.put('/:id', protect, restrictTo('admin'), updateMessage);
router.delete('/:id', protect, restrictTo('admin'), deleteMessage);

export default router;
