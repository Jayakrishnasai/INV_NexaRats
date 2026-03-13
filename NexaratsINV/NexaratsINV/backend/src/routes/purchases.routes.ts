import { Router } from 'express';
import { getPurchases, createPurchase } from '../controllers/purchases.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreatePurchaseSchema } from '../schemas';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('vendors', 'read'), getPurchases);
router.post('/', requirePermission('vendors', 'cru'), validate(CreatePurchaseSchema), createPurchase);

export default router;
