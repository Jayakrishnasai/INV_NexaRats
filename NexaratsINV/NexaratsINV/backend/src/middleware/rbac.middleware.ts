import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, AuthError } from '../utils/errors';

export type Module =
    | 'dashboard' | 'billing' | 'inventory' | 'customers'
    | 'vendors' | 'analytics' | 'settings' | 'online-store' | 'admin' | 'whatsapp';

export type AccessLevel = 'manage' | 'cru' | 'read' | 'none';

// Level hierarchy: manage > cru > read > none
const LEVEL_RANK: Record<AccessLevel, number> = {
    manage: 4,
    cru: 3,
    read: 2,
    none: 0,
};

/**
 * RBAC Guard Factory.
 * FIX C5: This is where server-side role enforcement happens.
 * Any route decorated with requirePermission(...) will verify that
 * the authenticated user has sufficient access level for the module.
 *
 * Super Admin and Admin roles always get 'manage' on all modules.
 * All other roles are checked against their permissions JSONB field.
 *
 * Usage:
 *   router.delete('/products/:id',
 *     requireAuth,
 *     requirePermission('inventory', 'manage'),
 *     deleteProduct
 *   );
 */
export const requirePermission = (module: Module | Module[], minLevel: AccessLevel) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new AuthError());
        }

        const { role, permissions } = req.user;

        // Super Admin and Admin bypass all RBAC checks (they have full manage access).
        // All other roles are checked against their permissions JSONB field.
        if (role === 'Super Admin' || role === 'Admin') {
            return next();
        }

        const modules = Array.isArray(module) ? module : [module];
        
        // Find if ANY of the modules meet the requirement
        const hasAccess = modules.some(m => {
            const userLevel = (permissions?.[m] as AccessLevel) || 'none';
            const userRank = LEVEL_RANK[userLevel] || 0;
            const requiredRank = LEVEL_RANK[minLevel];
            return userRank >= requiredRank;
        });

        if (!hasAccess) {
            const modulesStr = modules.join(' or ');
            const currentLevels = modules.map(m => `${m}: ${permissions?.[m] || 'none'}`).join(', ');
            return next(
                new ForbiddenError(
                    `Role '${role}' requires '${minLevel}' access to '${modulesStr}'. Current: ${currentLevels}.`
                )
            );
        }

        next();
    };
};
