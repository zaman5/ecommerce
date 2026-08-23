import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authRouteRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRouteRateLimiter, register);
router.post('/login', authRouteRateLimiter, login);
router.get('/me', protect, authenticatedRateLimiter, me);
router.put('/me', protect, authenticatedRateLimiter, updateProfile);

export default router;
