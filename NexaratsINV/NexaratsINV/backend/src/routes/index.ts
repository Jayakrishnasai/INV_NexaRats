import { Router } from 'express';
import authRoutes from './auth.routes';
import productsRoutes from './products.routes';
import customersRoutes from './customers.routes';
import vendorsRoutes from './vendors.routes';
import transactionsRoutes from './transactions.routes';
import purchasesRoutes from './purchases.routes';
import usersRoutes from './users.routes';
import whatsappRoutes from './whatsapp.routes';
import invoicesRoutes from './invoices.routes';
import paymentRoutes from './payment.routes';
import storeAuthRoutes from './store/store-auth.routes';
import storeDataRoutes from './store/store-data.routes';
import settingsRoutes from './settings.routes';
// ─── SaaS Layer Routes (New) ─────────────────────────────────────────────────
import saasRoutes from './saas.routes';
import billingRoutes from './billing.routes';
import keysRoutes from './keys.routes';
import onboardingRoutes from './onboarding.routes';
import adminRoutes from './admin.routes';
import dashboardRoutes from './dashboard.routes';
import analyticsRoutes from './analytics.routes';

const router = Router();

// ─── Public SaaS Routes (no auth) ────────────────────────────────────────────
router.use('/saas', saasRoutes);

// ─── Auth Routes ─────────────────────────────────────────────────────────────
router.use('/auth', authRoutes);

// ─── SaaS Subscription & Billing ──────────────────────────────────────────────
router.use('/billing', billingRoutes);

// ─── Razorpay Key Management ─────────────────────────────────────────────────
router.use('/keys', keysRoutes);

// ─── Onboarding State Machine ─────────────────────────────────────────────────
router.use('/onboarding', onboardingRoutes);

// ─── Internal Admin API (IP-restricted + admin JWT) ──────────────────────────
router.use('/admin', adminRoutes);

// ─── Product Routes ───────────────────────────────────────────────────────────
router.use('/products', productsRoutes);
router.use('/customers', customersRoutes);
router.use('/vendors', vendorsRoutes);
router.use('/transactions', transactionsRoutes);
router.use('/settings', settingsRoutes);
router.use('/purchases', purchasesRoutes);
router.use('/users', usersRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/payment', paymentRoutes);

// ─── Storefront Routes ────────────────────────────────────────────────────────
router.use('/store/auth', storeAuthRoutes);
router.use('/store', storeDataRoutes);

// ─── Dashboard & Analytics Routes ──────────────────────────────────────────────
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);

export default router;
