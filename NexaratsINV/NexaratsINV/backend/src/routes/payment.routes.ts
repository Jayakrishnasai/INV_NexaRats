import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { getPaymentConfig, createPaymentOrder, verifyAndProcessPayment } from '../controllers/payment.controller';

const router = Router();

// Config is readable by anyone authenticated (for "is Razorpay enabled?" check)
router.get('/config', requireAuth, getPaymentConfig);

// Creating orders and verifying payments requires billing CRU or higher
router.post('/create-order', requireAuth, requirePermission('billing', 'cru'), createPaymentOrder);
router.post('/verify', requireAuth, requirePermission('billing', 'cru'), verifyAndProcessPayment);

export default router;
