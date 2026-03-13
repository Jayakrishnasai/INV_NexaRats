import { Request, Response, NextFunction } from 'express';
import { whatsAppService } from '../services/whatsapp.service';
import { supabaseAdmin } from '../supabase/client';
import { sendSuccess } from '../utils/response';
import { wrapDatabaseError } from '../utils/errors';

import fs from 'fs';
import path from 'path';
import { generateInvoicePDFAsync } from '../services/pdf-invoice.service';

const getSessionId = (req: Request) => req.user?.org || req.user?.sub || 'default';

export const sendWhatsAppInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await whatsAppService.saveInvoiceToWhatsApp(getSessionId(req), req.body.billData, req.body.shopSettings);
        sendSuccess(res, result);
    } catch (err) { next(err); }
};

export const downloadPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { billData, shopSettings } = req.body;
        const pdfPath = await generateInvoicePDFAsync(billData, shopSettings);

        const invoiceNo = billData.invoiceNumber || billData.id || 'Invoice';
        const friendlyName = `${invoiceNo}.pdf`.replace(/[^a-zA-Z0-9.\-_]/g, '_');

        res.download(pdfPath, friendlyName, (err) => {
            if (err) {
                console.error("Error downloading PDF:", err);
            }
            // cleanup temp file after download
            fs.unlink(pdfPath, () => { });
        });
    } catch (err) { next(err); }
};

export const bulkMessage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const result = await whatsAppService.sendBulkMessage(getSessionId(req), req.body.recipients, req.body.message);
        sendSuccess(res, result);
    } catch (err) { next(err); }
};

/**
 * GET /api/invoices
 * Returns all invoices (transactions) with customer name joined.
 */
export const listInvoices = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { source, from, to, status } = req.query;

        let query = supabaseAdmin
            .from('transactions')
            .select(`
                id,
                date,
                subtotal,
                gst_amount,
                total,
                paid_amount,
                method,
                status,
                source,
                order_status,
                created_at,
                customers ( id, name, phone )
            `)
            .order('created_at', { ascending: false });

        if (source) query = query.eq('source', source as string);
        if (status) query = query.eq('status', status as string);
        if (from) query = query.gte('date', from as string);
        if (to) query = query.lte('date', to as string);

        const { data, error } = await query;
        if (error) throw wrapDatabaseError(error, 'InvoicesController');

        sendSuccess(res, data || []);
    } catch (err) { next(err); }
};

/**
 * GET /api/invoices/:id
 * Returns a single invoice with all line items.
 */
export const getInvoice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { data, error } = await supabaseAdmin
            .from('transactions')
            .select(`
                id,
                date,
                subtotal,
                gst_amount,
                total,
                paid_amount,
                method,
                status,
                source,
                order_status,
                created_at,
                customers ( id, name, phone, email, address ),
                invoice_items (
                    id,
                    product_name,
                    quantity,
                    price,
                    gst_amount,
                    discount
                )
            `)
            .eq('id', req.params.id)
            .single();

        if (error || !data) {
            res.status(404).json({ success: false, error: 'Invoice not found', code: 'NOT_FOUND' });
            return;
        }

        sendSuccess(res, data);
    } catch (err) { next(err); }
};

