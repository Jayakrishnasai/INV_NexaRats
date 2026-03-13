import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('settings', 'read'), getSettings);
router.post('/', requirePermission('settings', 'manage'), updateSettings);

export default router;
