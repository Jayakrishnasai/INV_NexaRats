import { Router, Request, Response, NextFunction } from 'express';
import {
    getStatus, getQr, waLogout, restart, requestPairingCode,
    sendMessage, sendReceipt, getMessages,
} from '../controllers/whatsapp.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
    SendWaMessageSchema, SendWaReceiptSchema, PairingCodeSchema,
} from '../schemas';

const router = Router();

// ─── Disable caching for WhatsApp routes (QR data changes frequently) ───────
const noCache = (_req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.removeHeader('ETag');
    next();
};

// ─── Public routes (no auth needed — let frontend see connection state) ─────
router.get('/status', noCache, getStatus);
router.get('/qr', noCache, getQr);

// ─── Protected routes (require auth + permissions) ──────────────────────────
router.use(requireAuth);
router.get('/messages', requirePermission('whatsapp', 'read'), getMessages);
router.post('/logout', requirePermission('whatsapp', 'manage'), waLogout);
router.post('/restart', requirePermission('whatsapp', 'manage'), restart);
router.post('/pairing-code', requirePermission('whatsapp', 'manage'), validate(PairingCodeSchema), requestPairingCode);
router.post('/send', requirePermission('whatsapp', 'cru'), validate(SendWaMessageSchema), sendMessage);
router.post('/send-receipt', requirePermission('whatsapp', 'cru'), validate(SendWaReceiptSchema), sendReceipt);

export default router;
