import { Router } from 'express';
import { handleWebhook, getSubscription, cancelSubscription, upgradeSubscription } from '../controllers/billing.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Raw body preservation for webhook — applied conditionally in app.ts
// See rawBody.middleware.ts for the implementation
router.post('/webhook', handleWebhook);

// Protected billing endpoints
router.get('/subscription', requireAuth, getSubscription);
router.post('/upgrade', requireAuth, upgradeSubscription);
router.post('/cancel', requireAuth, cancelSubscription);

export default router;
