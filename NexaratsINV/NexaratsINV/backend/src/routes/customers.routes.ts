import { Router } from 'express';
import {
    getCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
} from '../controllers/customers.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { CustomerCreateSchema, CustomerUpdateSchema } from '../schemas';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('customers', 'read'), getCustomers);
router.get('/:id', requirePermission('customers', 'read'), getCustomer);
router.post('/', requirePermission('customers', 'cru'), validate(CustomerCreateSchema), createCustomer);
router.put('/:id', requirePermission('customers', 'cru'), validate(CustomerUpdateSchema), updateCustomer);
router.delete('/:id', requirePermission('customers', 'cru'), deleteCustomer);

export default router;
