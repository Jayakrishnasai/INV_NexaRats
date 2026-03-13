import { Router } from 'express';
import { getOnboardingStatus, advanceOnboardingStep, completeOnboarding } from '../controllers/onboarding.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/status', getOnboardingStatus);
router.patch('/step', advanceOnboardingStep);
router.patch('/complete', completeOnboarding);

export default router;
