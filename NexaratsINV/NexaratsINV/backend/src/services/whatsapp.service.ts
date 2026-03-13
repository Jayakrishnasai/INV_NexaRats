import { supabaseAdmin } from '../supabase/client';
import { wrapDatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';
import { generateInvoicePDFAsync } from './pdf-invoice.service';
import fs from 'fs';

const log = logger('WhatsAppService');

// Base URL for the WhatsApp microservice
const WA_BASE = process.env.WA_API_URL || 'http://127.0.0.1:5005/api/whatsapp';

export class WhatsAppService {
    /** Generic GET request to the microservice */
    private async get(path: string): Promise<any> {
        try {
            const url = `${WA_BASE}${path}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            });
            return await res.json();
        } catch (error: any) {
            log.error(`WhatsApp GET ${path} failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /** Generic POST request to the microservice */
    private async post(path: string, body: any = {}): Promise<any> {
        try {
            const url = `${WA_BASE}${path}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const text = await res.text();
                let parsed: any = {};
                try { parsed = JSON.parse(text); } catch { }
                return { success: false, error: parsed.error || `HTTP ${res.status}: ${text}` };
            }
            return await res.json();
        } catch (error: any) {
            log.error(`WhatsApp POST ${path} failed: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * GET /api/whatsapp/status
     * Returns: { success, data: { status, connectionInfo, queueLength, reconnectAttempts, uptime } }
     */
    async getStatus(_sessionId: string): Promise<any> {
        const res = await this.get('/status');

        if (!res.success) {
            return {
                connected: false,
                status: 'disconnected',
                qrReady: false,
                qrCode: null,
                number: null,
                uptime: 0,
                messageQueueLength: 0,
            };
        }

        const data = res.data || {};
        const isReady = data.status === 'ready';

        // Also fetch QR if not ready
        let qrCode: string | null = null;
        let qrReady = false;
        if (!isReady) {
            const qrRes = await this.get('/qr');
            if (qrRes.success && qrRes.qr) {
                qrCode = qrRes.qr;
                qrReady = true;
            }
        }

        return {
            connected: isReady,
            status: data.status ?? 'disconnected',
            qrReady,
            qrCode,
            number: data.connectionInfo?.phoneNumber || null,
            uptime: data.uptime ?? 0,
            messageQueueLength: data.queueLength ?? 0,
            connectionInfo: data.connectionInfo || null,
            reconnectAttempts: data.reconnectAttempts ?? 0,
        };
    }

    /**
     * GET /api/whatsapp/qr
     */
    async getQr(_sessionId: string): Promise<{ qrCode: string | null; ready: boolean }> {
        const res = await this.get('/qr');
        return {
            qrCode: res.qr ?? null,
            ready: res.success && res.message === 'Already connected',
        };
    }

    /**
     * POST /api/whatsapp/logout
     */
    async logout(_sessionId: string): Promise<{ success: boolean }> {
        const res = await this.post('/logout');
        return { success: !!res.success };
    }

    /**
     * POST /api/whatsapp/restart
     */
    async restart(_sessionId: string): Promise<{ success: boolean }> {
        const res = await this.post('/restart');
        return { success: !!res.success };
    }

    /**
     * POST /api/whatsapp/pair
     */
    async requestPairingCode(_sessionId: string, phone: string): Promise<{ success: boolean; code?: string; error?: string }> {
        const res = await this.post('/pair', { phoneNumber: phone });
        if (!res.success) {
            return { success: false, error: res.error };
        }
        return { success: true, code: res.pairingCode };
    }

    /**
     * POST /api/whatsapp/send — { to, type, content }
     */
    async send(_sessionId: string, to: string, type: string, content: string): Promise<{ success: boolean; messageId?: string }> {
        const res = await this.post('/send', { to, type, content });

        // Save to Supabase for history
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        try {
            await supabaseAdmin
                .from('whatsapp_messages')
                .insert({
                    id: msgId,
                    to,
                    type,
                    content,
                    status: res.success ? 'sent' : 'failed',
                });
        } catch (dbErr: any) {
            log.warn(`Failed to log WhatsApp message to DB: ${dbErr.message}`);
        }

        if (!res.success) {
            log.warn(`WhatsApp message to ${to} failed`, { type, error: res.error });
            return { success: false };
        }
        return { success: true, messageId: res.data?.id || msgId };
    }

    /**
     * POST /api/whatsapp/send-receipt
     */
    async sendReceipt(_sessionId: string, receiptData: any): Promise<{ success: boolean }> {
        const { phone, storeName, invoiceNo, items, total } = receiptData;

        const receipt = {
            storeName,
            invoiceNo,
            date: receiptData.date,
            items,
            subtotal: receiptData.subtotal,
            tax: receiptData.tax,
            total,
            footer: receiptData.footer || 'Thank you for shopping with us!',
        };

        const res = await this.post('/send-receipt', { to: phone, receipt });
        return { success: !!res.success };
    }

    /**
     * POST /api/whatsapp/send-bulk
     */
    async sendBulkMessage(
        _sessionId: string,
        recipients: { name: string; phone: string }[],
        message: string
    ): Promise<{ sent: number; failed: number; skipped: number }> {
        const validRecipients = recipients.filter(r => r.phone && r.phone.length >= 10);
        const skipped = recipients.length - validRecipients.length;

        const messages = validRecipients.map(r => {
            // Normalize phone: auto-prepend 91 for 10-digit Indian numbers
            let phone = r.phone.replace(/[^0-9]/g, '');
            if (phone.length === 10) phone = '91' + phone;

            return {
                to: phone,
                type: 'text',
                // Support both {name} and {{name}} template formats
                content: message.replace(/\{\{name\}\}/g, r.name).replace(/\{name\}/g, r.name),
            };
        });

        const res = await this.post('/send-bulk', { messages });

        if (!res.success) {
            return { sent: 0, failed: validRecipients.length, skipped };
        }

        return { sent: validRecipients.length, failed: 0, skipped };
    }

    /**
     * GET /api/whatsapp/messages
     */
    async getMessages(_sessionId: string, page: number, limit: number, status?: string, to?: string): Promise<any[]> {
        // Try microservice first
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (status) params.set('status', status);
        if (to) params.set('to', to);

        const res = await this.get(`/messages?${params.toString()}`);
        if (res.success && Array.isArray(res.data)) {
            return res.data;
        }

        // Fallback to Supabase
        let query = supabaseAdmin
            .from('whatsapp_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (status) query = query.eq('status', status);
        if (to) query = query.eq('to', to);

        const { data, error } = await query;
        if (error) throw wrapDatabaseError(error, 'WhatsAppService.getMessages');
        return data || [];
    }

    /**
     * Generate a PDF invoice and send it via WhatsApp as a document
     */
    async saveInvoiceToWhatsApp(_sessionId: string, billData: any, shopSettings: any): Promise<{ success: boolean }> {
        let phone = billData.customerPhone;
        if (!phone) return { success: false };

        // Normalize phone: strip spaces/dashes, prepend 91 for 10-digit Indian numbers
        phone = phone.replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = '91' + phone;

        try {
            // Generate PDF invoice
            const pdfPath = await generateInvoicePDFAsync(billData, shopSettings);
            const invoiceNo = billData.invoiceNumber || billData.id || `INV-${Date.now()}`;
            const filename = `Invoice_${invoiceNo.replace(/[^a-zA-Z0-9\-]/g, '_')}.pdf`;
            const caption = `📄 Invoice ${invoiceNo} — ${shopSettings?.shopName || 'Invoice'}`;

            // Send PDF as document via WhatsApp microservice
            const res = await this.post('/queue-document', {
                to: phone,
                filePath: pdfPath,
                filename,
                caption,
                metadata: { invoiceNo, type: 'invoice' },
            });

            // Log to Supabase for history visibility
            const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            try {
                await supabaseAdmin
                    .from('whatsapp_messages')
                    .insert({
                        id: msgId,
                        to: phone,
                        type: 'document',
                        content: caption,
                        status: res.success ? 'sent' : 'failed',
                    });
            } catch (dbErr: any) {
                log.warn(`Failed to log document message to DB: ${dbErr.message}`);
            }

            // Clean up temp file after 5 minutes
            setTimeout(() => {
                try { fs.unlinkSync(pdfPath); } catch { /* ignore */ }
            }, 5 * 60 * 1000);

            if (!res.success) {
                log.warn(`WhatsApp invoice PDF to ${phone} failed`, { error: res.error });
                // Fallback: send as text message
                const format = billData.format || 'a4';
                const content = this.formatInvoice(billData, shopSettings, format);
                return this.send(_sessionId, phone, 'text', content);
            }

            return { success: true };
        } catch (err: any) {
            log.error(`PDF invoice generation failed: ${err.message}`);
            // Fallback: send as text message
            const format = billData.format || 'a4';
            const content = this.formatInvoice(billData, shopSettings, format);
            return this.send(_sessionId, phone, 'text', content);
        }
    }

    private formatInvoice(bill: any, shop: any, format: string = 'a4'): string {
        const items: any[] = bill.items || [];
        const now = new Date();
        const dateStr = bill.date
            ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

        // Calculate totals
        const subtotal = items.reduce((s: number, i: any) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
        const gstAmount = Number(bill.gstAmount) || items.reduce((s: number, i: any) => s + (Number(i.gstRate || 0) / 100) * Number(i.price) * Number(i.quantity || 1), 0);
        const grandTotal = Number(bill.grandTotal) || Number(bill.total) || (subtotal + gstAmount);
        const paymentMode = bill.paymentMode || 'cash';

        const shopName = shop?.shopName || shop?.name || shop?.businessName || 'My Store';
        const shopAddr = shop?.address || '';
        const shopPhone = shop?.phone || '';
        const shopEmail = shop?.email || '';
        const invoiceNo = bill.invoiceNumber || bill.id || `INV-${Date.now()}`;
        const customerName = bill.customerName || 'Walk-in Customer';

        // Format payment mode label
        const paymentLabel = paymentMode === 'cash' ? 'Cash' : paymentMode === 'upi' ? 'UPI' : paymentMode === 'card' ? 'Card' : paymentMode === 'bank_transfer' ? 'Bank Transfer' : paymentMode;

        const divider = format === 'thermal' ? '─'.repeat(28) : '━'.repeat(32);
        const thinDivider = format === 'thermal' ? '·'.repeat(28) : '─'.repeat(32);

        // Build items list
        const itemLines = items.map((item: any, idx: number) => {
            const qty = Number(item.quantity || 1);
            const price = Number(item.price || 0);
            const total = qty * price;
            const unit = item.unit || 'nos';

            if (format === 'thermal') {
                return `${idx + 1}. ${item.name}\n   ${qty} ${unit} × ₹${price.toLocaleString('en-IN')} = *₹${total.toLocaleString('en-IN')}*`;
            }
            // A4 style - more detailed
            const hsnLine = item.hsnCode ? ` (HSN: ${item.hsnCode})` : '';
            const gstLine = item.gstRate ? ` | GST ${item.gstRate}%` : '';
            return `${String(idx + 1).padStart(2, '0')}. *${item.name}*${hsnLine}\n     ${qty} ${unit} × ₹${price.toLocaleString('en-IN')} = *₹${total.toLocaleString('en-IN')}*${gstLine}`;
        });

        if (format === 'thermal') {
            // ── Compact thermal receipt format ──
            return [
                `🧾 *${shopName}*`,
                shopAddr ? `📍 ${shopAddr}` : '',
                shopPhone ? `📞 ${shopPhone}` : '',
                divider,
                `*Bill:* ${invoiceNo}`,
                `*Date:* ${dateStr} | ${timeStr}`,
                `*Customer:* ${customerName}`,
                divider,
                ...itemLines,
                thinDivider,
                `     Subtotal:  ₹${subtotal.toLocaleString('en-IN')}`,
                `     GST:       ₹${gstAmount.toLocaleString('en-IN')}`,
                divider,
                `     *TOTAL:    ₹${grandTotal.toLocaleString('en-IN')}*`,
                divider,
                `💳 Paid via *${paymentLabel}*`,
                ``,
                `✅ Thank you for shopping with us!`,
            ].filter(Boolean).join('\n');
        }

        // ── Full A4 invoice format ──
        return [
            `┏${'━'.repeat(32)}┓`,
            `  🏪 *${shopName.toUpperCase()}*`,
            shopAddr ? `  📍 ${shopAddr}` : '',
            shopPhone ? `  📞 ${shopPhone}` : '',
            shopEmail ? `  ✉️ ${shopEmail}` : '',
            `┗${'━'.repeat(32)}┛`,
            ``,
            `📄 *TAX INVOICE*`,
            `${'─'.repeat(32)}`,
            `*Invoice:*  ${invoiceNo}`,
            `*Date:*     ${dateStr}`,
            `*Time:*     ${timeStr}`,
            ``,
            `*Bill To:*`,
            `  👤 ${customerName}`,
            bill.customerPhone ? `  📱 ${bill.customerPhone}` : '',
            `${'─'.repeat(32)}`,
            ``,
            `📦 *ITEMS*`,
            `${'─'.repeat(32)}`,
            ...itemLines,
            ``,
            `${'━'.repeat(32)}`,
            `  Subtotal:     ₹${subtotal.toLocaleString('en-IN')}`,
            gstAmount > 0 ? `  GST:          ₹${gstAmount.toLocaleString('en-IN')}` : '',
            bill.couponDiscount ? `  Discount:    -₹${Number(bill.couponDiscount).toLocaleString('en-IN')}` : '',
            `${'━'.repeat(32)}`,
            `  *GRAND TOTAL: ₹${grandTotal.toLocaleString('en-IN')}*`,
            `${'━'.repeat(32)}`,
            ``,
            `💳 *Payment:* ${paymentLabel}`,
            `✅ *Status:* PAID`,
            ``,
            `${'─'.repeat(32)}`,
            shop?.footer || `🙏 Thank you for your business!`,
            `_Invoice generated by ${shopName}_`,
        ].filter(Boolean).join('\n');
    }
}

export const whatsAppService = new WhatsAppService();
