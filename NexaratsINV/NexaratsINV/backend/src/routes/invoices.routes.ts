import { Router } from 'express';
import { sendWhatsAppInvoice, bulkMessage, listInvoices, getInvoice, downloadPdf } from '../controllers/invoices.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { SendWaWhatsAppInvoiceSchema, BulkMessageSchema } from '../schemas';

const router = Router();
router.use(requireAuth);

router.get('/', requirePermission(['billing', 'online-store'], 'read'), listInvoices);
router.get('/:id', requirePermission(['billing', 'online-store'], 'read'), getInvoice);
router.post('/send-whatsapp', requirePermission(['billing', 'whatsapp'], 'cru'), validate(SendWaWhatsAppInvoiceSchema), sendWhatsAppInvoice);
router.post('/download-pdf', requirePermission(['billing', 'online-store'], 'read'), downloadPdf);
router.post('/bulk-message', requirePermission(['customers', 'whatsapp'], 'manage'), validate(BulkMessageSchema), bulkMessage);

export default router;

