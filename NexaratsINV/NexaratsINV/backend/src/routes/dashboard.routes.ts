import { Router } from 'express';
import { getDashboardData, resetDashboardData } from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('dashboard', 'read'), getDashboardData);
router.post('/reset', requirePermission('admin', 'manage'), resetDashboardData);

export default router;
