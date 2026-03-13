import { Router } from 'express';
import { saveRazorpayKeys, validateRazorpayKeys, getKeyStatus, deleteRazorpayKeys } from '../controllers/keys.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { RazorpayKeySchema } from '../schemas';

const router = Router();

// All key management routes require authentication
router.use(requireAuth);

router.get('/status', getKeyStatus);
router.post('/razorpay', validate(RazorpayKeySchema), saveRazorpayKeys);
router.post('/validate', validateRazorpayKeys);
router.delete('/razorpay', deleteRazorpayKeys);

export default router;
