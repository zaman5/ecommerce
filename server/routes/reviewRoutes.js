import { Router } from 'express';
import { deleteReview } from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// Author or admin. (Listing/creating happens under /api/products/:slug/reviews.)
router.delete('/:id', protect, deleteReview);

export default router;
