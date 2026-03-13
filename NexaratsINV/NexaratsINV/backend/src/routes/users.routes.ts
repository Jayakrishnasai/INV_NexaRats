import { Router } from 'express';
import { getUsers, createUser, updateUser, deleteUser } from '../controllers/users.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { CreateUserSchema, UpdateUserSchema } from '../schemas';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission('admin', 'read'), getUsers);
router.post('/', requirePermission('admin', 'cru'), validate(CreateUserSchema), createUser);
router.put('/:id', requirePermission('admin', 'cru'), validate(UpdateUserSchema), updateUser);
router.delete('/:id', requirePermission('admin', 'manage'), deleteUser);

export default router;
