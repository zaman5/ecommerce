import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authRouteRateLimiter, authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../validators/schemas.js';

const router = Router();

router.post('/register', authRouteRateLimiter, validateBody(registerSchema), register);
router.post('/login', authRouteRateLimiter, validateBody(loginSchema), login);
router.get('/me', protect, authenticatedRateLimiter, me);
router.put('/me', protect, authenticatedRateLimiter, validateBody(updateProfileSchema), updateProfile);

export default router;
