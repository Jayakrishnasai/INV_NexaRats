import { Router } from 'express';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../controllers/vendors.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { VendorCreateSchema, VendorUpdateSchema } from '../schemas';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('vendors', 'read'), getVendors);
router.post('/', requirePermission('vendors', 'cru'), validate(VendorCreateSchema), createVendor);
router.put('/:id', requirePermission('vendors', 'cru'), validate(VendorUpdateSchema), updateVendor);
// FIX I3: Vendor delete — was missing, now implemented
router.delete('/:id', requirePermission('vendors', 'cru'), deleteVendor);

export default router;
