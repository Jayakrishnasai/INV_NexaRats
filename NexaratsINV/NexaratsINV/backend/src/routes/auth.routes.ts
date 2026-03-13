import { Router } from 'express';
import { signup, verifyEmail } from '../controllers/signup.controller';
import { login, refresh, logout } from '../controllers/auth.controller';
import { getMe, forgotPassword, resetPassword } from '../controllers/user.controller';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rateLimit.middleware';
import {
    SignupSchema,
    LoginSchema,
    RefreshSchema,
    ForgotPasswordSchema,
    ResetPasswordSchema,
} from '../schemas';

const router = Router();

// Public — rate-limited
router.post('/signup', authRateLimiter, validate(SignupSchema), signup);
router.post('/login', authRateLimiter, validate(LoginSchema), login);
router.post('/refresh', validate(RefreshSchema), refresh);
router.post('/verify-email', authRateLimiter, verifyEmail);
router.post('/forgot-password', authRateLimiter, validate(ForgotPasswordSchema), forgotPassword);
router.post('/reset-password', authRateLimiter, validate(ResetPasswordSchema), resetPassword);

// Protected
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
