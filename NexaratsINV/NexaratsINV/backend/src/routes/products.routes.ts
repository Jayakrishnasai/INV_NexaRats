import { Router } from 'express';
import {
    getProducts, getProduct, createProduct,
    updateProduct, deleteProduct, bulkUpdateProducts, bulkCreateProducts
} from '../controllers/products.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { ProductCreateSchema, ProductUpdateSchema, BulkUpdateSchema, BulkCreateSchema } from '../schemas';

const router = Router();

// Protect ALL product routes (admin inventory API)
// Public storefront reads products via /store/products (separate unauthenticated route)
router.use(requireAuth);

// Note: /bulk must come BEFORE /:id so Express does not treat 'bulk' as an ID
router.get('/', getProducts);
router.get('/:id', getProduct);
router.patch('/bulk', requirePermission('inventory', 'cru'), validate(BulkUpdateSchema), bulkUpdateProducts);
router.post('/bulk', requirePermission('inventory', 'cru'), validate(BulkCreateSchema), bulkCreateProducts);
router.post('/', requirePermission('inventory', 'cru'), validate(ProductCreateSchema), createProduct);
router.put('/:id', requirePermission('inventory', 'cru'), validate(ProductUpdateSchema), updateProduct);
router.delete('/:id', requirePermission('inventory', 'cru'), deleteProduct);

export default router;
