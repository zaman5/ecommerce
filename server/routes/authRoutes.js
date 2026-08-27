import { Router } from 'express';
import { register, login, me, updateProfile, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authRouteRateLimiter, authenticatedRateLimiter, passwordResetRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { registerSchema, loginSchema, updateProfileSchema, forgotPasswordSchema, resetPasswordSchema } from '../validators/schemas.js';

const router = Router();

// Stricter Auth routes with dual IP & Account limits + Exponential Backoff
router.post('/register', authRouteRateLimiter, validateBody(registerSchema), register);
router.post('/login', authRouteRateLimiter, validateBody(loginSchema), login);

// Stricter Password Reset routes
router.post('/forgot-password', passwordResetRateLimiter, validateBody(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, validateBody(resetPasswordSchema), resetPassword);

// Looser Authenticated profile routes
router.get('/me', protect, authenticatedRateLimiter, me);
router.put('/me', protect, authenticatedRateLimiter, validateBody(updateProfileSchema), updateProfile);

export default router;
