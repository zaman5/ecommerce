import { Router } from 'express';
import { deleteReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';
import { authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateParams } from '../middleware/validator.js';
import { idParamSchema } from '../validators/schemas.js';

const router = Router();

router.delete('/:id', protect, authenticatedRateLimiter, validateParams(idParamSchema), deleteReview);

export default router;
