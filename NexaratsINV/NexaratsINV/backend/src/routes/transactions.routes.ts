import { Router } from 'express';
import {
    getTransactions, createTransaction, updateTransaction, deleteTransaction
} from '../controllers/transactions.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateTransactionSchema, UpdateTransactionSchema } from '../schemas';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['billing', 'online-store'], 'read'), getTransactions);
// POST is routed to SaleService (atomic) — FIX C2
router.post('/', requirePermission(['billing', 'online-store'], 'cru'), validate(CreateTransactionSchema), createTransaction);
router.put('/:id', requirePermission(['billing', 'online-store'], 'cru'), validate(UpdateTransactionSchema), updateTransaction);
router.delete('/:id', requirePermission(['billing', 'online-store'], 'cru'), deleteTransaction);

export default router;
