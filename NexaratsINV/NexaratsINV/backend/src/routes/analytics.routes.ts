import { Router } from 'express';
import { getReports, downloadReport, triggerExport } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('analytics', 'read'), getReports);
router.get('/download/:filename', requirePermission('analytics', 'read'), downloadReport);
router.post('/trigger', requirePermission('analytics', 'manage'), triggerExport); // manual trigger for testing

export default router;
