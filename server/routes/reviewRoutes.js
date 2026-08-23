import { Router } from 'express';
import { deleteReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';
import { authenticatedRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.delete('/:id', protect, authenticatedRateLimiter, deleteReview);

export default router;
