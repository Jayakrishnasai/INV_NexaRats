import { Router } from 'express';
import {
    getDashboard,
    getOrganizations,
    getOrganizationDetail,
    getSubscriptions,
    getPayments,
    getLogs,
    suspendOrganization,
    activateOrganization,
    getRevenue,
    updatePlan,
    adminLogin,
    getUsers,
} from '../controllers/admin.controller';
import { requireAdmin } from '../middleware/requireAdmin.middleware';
import { requireAdminIP } from '../middleware/requireAdminIP.middleware';

const router = Router();

// F19: Admin login — MUST be before the global middleware guards
// Only IP-checked (can't require admin JWT here — that's what login gives you)
router.post('/auth/login', requireAdminIP, adminLogin);

// All other admin routes: IP-check + admin JWT
router.use(requireAdminIP);
router.use(requireAdmin);

// Dashboard KPIs
router.get('/dashboard', getDashboard);

// Organizations (tenants)
router.get('/organizations', getOrganizations);
router.get('/organizations/:id', getOrganizationDetail);
router.post('/organizations/:id/suspend', suspendOrganization);
router.post('/organizations/:id/activate', activateOrganization);

// Subscriptions + Revenue
router.get('/subscriptions', getSubscriptions);
router.get('/payments', getPayments);
router.get('/revenue', getRevenue);

// Plan management
router.patch('/plans/:id', updatePlan);

// Users
router.get('/users', getUsers);

// Audit logs
router.get('/logs', getLogs);

export default router;
