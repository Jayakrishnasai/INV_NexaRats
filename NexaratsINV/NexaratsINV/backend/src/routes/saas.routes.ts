import { Router } from 'express';
import { getPlans, getPlan } from '../controllers/saas.controller';

const router = Router();

// Public — no auth required. Pricing page fetches these.
router.get('/plans', getPlans);
router.get('/plans/:id', getPlan);

export default router;
