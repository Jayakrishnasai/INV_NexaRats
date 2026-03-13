import { Router } from 'express';
import {
    sendOtp, verifyOtp, storeLogin, storeSignup, storeRegister,
    setPassword, getSession, storeLogout,
} from '../../controllers/store/store-auth.controller';
import { requireStoreAuth } from '../../middleware/store-auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import {
    SendOtpSchema, VerifyOtpSchema, StoreLoginSchema,
    StoreSignupSchema, StoreRegisterSchema, SetPasswordSchema,
} from '../../schemas';
import { otpRateLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

// Public routes
router.post('/send-otp', otpRateLimiter, validate(SendOtpSchema), sendOtp);
router.post('/verify-otp', validate(VerifyOtpSchema), verifyOtp);
router.post('/login', validate(StoreLoginSchema), storeLogin);
router.post('/signup', validate(StoreSignupSchema), storeSignup);
router.post('/register', validate(StoreRegisterSchema), storeRegister);
router.get('/session', getSession);

// Protected store routes
router.post('/set-password', requireStoreAuth, validate(SetPasswordSchema), setPassword);
router.post('/logout', requireStoreAuth, storeLogout);

export default router;
