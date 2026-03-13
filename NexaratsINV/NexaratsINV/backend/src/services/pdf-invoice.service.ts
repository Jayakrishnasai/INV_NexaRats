import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface InvoiceItem {
    name: string;
    quantity: number;
    price: number;
    gstRate?: number;
    taxType?: string;
    hsnCode?: string;
    unit?: string;
}

interface InvoiceData {
    invoiceNumber: string;
    date: string;
    customerName: string;
    customerPhone: string;
    items: InvoiceItem[];
    grandTotal: number;
    total: number;
    gstAmount: number;
    paymentMode: string;
    couponDiscount?: number;
    format?: string;
}

interface ShopSettings {
    shopName: string;
    address: string;
    phone: string;
    email: string;
    footer?: string;
    gstNumber?: string;
    signature?: string;
}

/**
 * Generates a professional PDF invoice and returns the file path.
 */
export function generateInvoicePDF(bill: InvoiceData, shop: ShopSettings): string {
    const items: InvoiceItem[] = bill.items || [];
    const now = new Date();
    const dateStr = bill.date
        ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const subtotal = items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
    const gstAmount = Number(bill.gstAmount) || 0;
    const grandTotal = Number(bill.grandTotal) || Number(bill.total) || (subtotal + gstAmount);
    const paymentMode = bill.paymentMode || 'cash';
    const paymentLabel = paymentMode === 'cash' ? 'Cash' : paymentMode === 'upi' ? 'UPI' : paymentMode === 'card' ? 'Card' : paymentMode === 'bank_transfer' ? 'Bank Transfer' : paymentMode;
    const invoiceNo = bill.invoiceNumber || bill.invoiceNumber || `INV-${Date.now()}`;
    const customerName = bill.customerName || 'Walk-in Customer';
    const isThermal = bill.format === 'thermal';

    // Create temp file
    const tmpDir = os.tmpdir();
    const filename = `invoice_${invoiceNo.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(tmpDir, filename);

    const pageWidth = isThermal ? 226 : 595.28; // 80mm thermal or A4
    const pageHeight = isThermal ? 800 : 841.89;

    const doc = new PDFDocument({
        size: isThermal ? [pageWidth, pageHeight] : 'A4',
        margins: isThermal
            ? { top: 20, bottom: 20, left: 15, right: 15 }
            : { top: 40, bottom: 40, left: 50, right: 50 },
        autoFirstPage: true,
        bufferPages: true,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const contentWidth = pageWidth - (isThermal ? 30 : 100);
    const primaryColor = '#1E40AF';
    const darkColor = '#1E293B';
    const greyColor = '#64748B';

    const fmt = (val: number) => '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (isThermal) {
        // ═══════════════ THERMAL RECEIPT ═══════════════
        const cx = pageWidth / 2;
        let y = 20;

        // Shop name
        doc.font('Helvetica-Bold').fontSize(14).text(shop.shopName.toUpperCase(), 15, y, { width: contentWidth, align: 'center' });
        y += 20;
        doc.font('Helvetica').fontSize(7).fillColor(greyColor);
        if (shop.address) { doc.text(shop.address, 15, y, { width: contentWidth, align: 'center' }); y += 10; }
        if (shop.phone) { doc.text(`Ph: ${shop.phone}`, 15, y, { width: contentWidth, align: 'center' }); y += 10; }

        // Dashed line
        y += 5;
        for (let x = 15; x < pageWidth - 15; x += 4) {
            doc.moveTo(x, y).lineTo(x + 2, y).stroke('#CBD5E1');
        }
        y += 8;

        // Bill info
        doc.font('Helvetica').fontSize(7).fillColor(darkColor);
        doc.text(`Bill: ${invoiceNo}`, 15, y); doc.text(`${dateStr}`, 15, y, { width: contentWidth, align: 'right' }); y += 10;
        if (customerName !== 'Walk-in Customer') { doc.text(`Customer: ${customerName}`, 15, y); y += 10; }
        if (bill.customerPhone) { doc.text(`Ph: ${bill.customerPhone}`, 15, y); y += 10; }

        // Dashed line
        y += 3;
        for (let x = 15; x < pageWidth - 15; x += 4) {
            doc.moveTo(x, y).lineTo(x + 2, y).stroke('#CBD5E1');
        }
        y += 8;

        // Items
        items.forEach((item) => {
            doc.font('Helvetica-Bold').fontSize(7).fillColor(darkColor).text(item.name, 15, y); y += 10;
            const lineTotal = Number(item.price) * Number(item.quantity || 1);
            doc.font('Helvetica').fontSize(7).fillColor(greyColor);
            doc.text(`${item.quantity} x ${fmt(item.price)}`, 15, y);
            doc.text(fmt(lineTotal), 15, y, { width: contentWidth, align: 'right' });
            y += 12;
        });

        // Dashed line
        for (let x = 15; x < pageWidth - 15; x += 4) {
            doc.moveTo(x, y).lineTo(x + 2, y).stroke('#CBD5E1');
        }
        y += 8;

        // Totals
        doc.font('Helvetica').fontSize(7).fillColor(greyColor);
        doc.text('Subtotal:', 15, y); doc.text(fmt(subtotal), 15, y, { width: contentWidth, align: 'right' }); y += 12;
        doc.text('GST:', 15, y); doc.text(fmt(gstAmount), 15, y, { width: contentWidth, align: 'right' }); y += 12;
        if (bill.couponDiscount) {
            doc.text('Discount:', 15, y); doc.text(`-${fmt(bill.couponDiscount)}`, 15, y, { width: contentWidth, align: 'right' }); y += 12;
        }

        // Grand total
        y += 2;
        doc.rect(15, y, contentWidth, 22).fill('#1E293B');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
        doc.text('TOTAL', 20, y + 5); doc.text(fmt(grandTotal), 20, y + 5, { width: contentWidth - 10, align: 'right' });
        y += 30;

        // Footer
        doc.font('Helvetica').fontSize(6).fillColor(greyColor).text(`Paid via ${paymentLabel}`, 15, y, { width: contentWidth, align: 'center' }); y += 10;
        doc.text(shop.footer || 'Thank you! Visit again!', 15, y, { width: contentWidth, align: 'center' });
    } else {
        // ═══════════════ A4 INVOICE ═══════════════
        let y = 40;

        // ── Header bar ──
        doc.rect(0, 0, pageWidth, 12).fill(primaryColor);

        // Business name + logo initial
        doc.rect(50, y, 48, 48).fillAndStroke(primaryColor, primaryColor);
        doc.font('Helvetica-Bold').fontSize(28).fillColor('#FFFFFF').text(shop.shopName.charAt(0).toUpperCase(), 50, y + 8, { width: 48, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(22).fillColor(darkColor).text(shop.shopName, 110, y + 4);
        doc.font('Helvetica').fontSize(8).fillColor(greyColor).text(shop.address, 110, y + 30);
        doc.text(`${shop.phone}  |  ${shop.email}`, 110, y + 42);

        // Invoice title
        doc.font('Helvetica-Bold').fontSize(28).fillColor(primaryColor).text('INVOICE', 0, y, { width: pageWidth - 50, align: 'right' });
        doc.font('Helvetica').fontSize(9).fillColor(greyColor).text(invoiceNo, 0, y + 32, { width: pageWidth - 50, align: 'right' });
        doc.text(`Date: ${dateStr}`, 0, y + 44, { width: pageWidth - 50, align: 'right' });

        y += 75;

        // Horizontal rule
        doc.moveTo(50, y).lineTo(pageWidth - 50, y).lineWidth(3).stroke(primaryColor);
        y += 20;

        // Customer info + Payment
        doc.font('Helvetica-Bold').fontSize(7).fillColor(primaryColor).text('BILL TO', 50, y);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(primaryColor).text('PAYMENT', 350, y);
        y += 14;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(darkColor).text(customerName, 50, y);
        doc.font('Helvetica').fontSize(9).fillColor(greyColor).text(`Method: ${paymentLabel}`, 350, y);
        y += 16;
        doc.font('Helvetica').fontSize(9).fillColor(greyColor).text(bill.customerPhone || 'N/A', 50, y);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#059669').text('PAID ✓', 350, y);

        y += 30;

        // ── Items Table ──
        const tableLeft = 50;
        const tableRight = pageWidth - 50;
        const colWidths = [30, 180, 50, 55, 60, 50, 70];
        const colStarts = [tableLeft];
        for (let i = 1; i < colWidths.length; i++) {
            colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
        }
        const headers = ['SL', 'DESCRIPTION', 'HSN', 'QTY', 'PRICE', 'GST', 'TOTAL'];

        // Header row
        doc.rect(tableLeft, y, tableRight - tableLeft, 28).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
        headers.forEach((h, i) => {
            const align = i >= 3 ? 'right' : 'left';
            doc.text(h, colStarts[i] + 6, y + 9, { width: colWidths[i] - 12, align });
        });
        y += 28;

        // Item rows
        items.forEach((item, idx) => {
            const rowH = 32;
            const lineTotal = Number(item.price) * Number(item.quantity || 1);

            if (idx % 2 === 0) {
                doc.rect(tableLeft, y, tableRight - tableLeft, rowH).fill('#F8FAFC');
            }

            doc.font('Helvetica').fontSize(8).fillColor(greyColor);
            doc.text(String(idx + 1).padStart(2, '0'), colStarts[0] + 6, y + 8, { width: colWidths[0] - 12 });

            doc.font('Helvetica-Bold').fontSize(8).fillColor(darkColor);
            doc.text(item.name, colStarts[1] + 6, y + 6, { width: colWidths[1] - 12 });
            doc.font('Helvetica').fontSize(6).fillColor(greyColor);
            doc.text(`${item.unit || 'PCS'}`, colStarts[1] + 6, y + 18, { width: colWidths[1] - 12 });

            doc.font('Helvetica').fontSize(8).fillColor(greyColor);
            doc.text(item.hsnCode || '-', colStarts[2] + 6, y + 10, { width: colWidths[2] - 12 });
            doc.text(String(item.quantity), colStarts[3] + 6, y + 10, { width: colWidths[3] - 12, align: 'right' });
            doc.text(fmt(item.price), colStarts[4] + 6, y + 10, { width: colWidths[4] - 12, align: 'right' });
            doc.text(`${item.gstRate || 0}%`, colStarts[5] + 6, y + 10, { width: colWidths[5] - 12, align: 'right' });

            doc.font('Helvetica-Bold').fontSize(8).fillColor(darkColor);
            doc.text(fmt(lineTotal), colStarts[6] + 6, y + 10, { width: colWidths[6] - 12, align: 'right' });

            y += rowH;
        });

        // Table bottom border
        doc.moveTo(tableLeft, y).lineTo(tableRight, y).lineWidth(1).stroke('#E2E8F0');
        y += 20;

        // ── Totals section ──
        const totalsX = 350;
        const totalsW = tableRight - totalsX;

        doc.rect(totalsX, y, totalsW, 110 + (bill.couponDiscount ? 18 : 0)).fill('#F8FAFC').stroke('#E2E8F0');
        let ty = y + 12;

        const drawTotalRow = (label: string, value: string, bold = false, color = greyColor) => {
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(color);
            doc.text(label, totalsX + 15, ty, { width: 100 });
            doc.text(value, totalsX + 15, ty, { width: totalsW - 30, align: 'right' });
            ty += 18;
        };

        drawTotalRow('Subtotal', fmt(subtotal));
        drawTotalRow('CGST (9%)', fmt(gstAmount / 2));
        drawTotalRow('SGST (9%)', fmt(gstAmount / 2));
        if (bill.couponDiscount) {
            drawTotalRow('Discount', `-${fmt(bill.couponDiscount)}`, false, '#059669');
        }

        // Grand total highlight
        ty += 4;
        doc.moveTo(totalsX + 10, ty).lineTo(totalsX + totalsW - 10, ty).lineWidth(3).stroke(primaryColor);
        ty += 10;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('GRAND TOTAL', totalsX + 15, ty);
        doc.font('Helvetica-Bold').fontSize(16).fillColor(darkColor).text(fmt(grandTotal), totalsX + 15, ty - 4, { width: totalsW - 30, align: 'right' });

        // ── Footer ──
        const footerY = pageHeight - 100;

        // Signature area
        doc.rect(50, footerY, 150, 1).fill('#E2E8F0');
        doc.font('Helvetica').fontSize(7).fillColor(greyColor).text('Authorized Signature', 50, footerY + 5);

        // Business name
        doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor).text(shop.shopName, 0, footerY - 5, { width: pageWidth - 50, align: 'right' });
        doc.font('Helvetica').fontSize(7).fillColor(greyColor).text(shop.footer || 'Thank you for your business!', 0, footerY + 10, { width: pageWidth - 50, align: 'right' });
    }

    doc.end();

    // Wait for the stream to finish
    return new Promise<string>((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
    }) as unknown as string;
}

/**
 * Async version that properly waits for PDF write to complete.
 */
export async function generateInvoicePDFAsync(bill: InvoiceData, shop: ShopSettings): Promise<string> {
    const items: InvoiceItem[] = bill.items || [];
    const now = new Date();
    const dateStr = bill.date
        ? new Date(bill.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

    const subtotal = items.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
    const gstAmount = Number(bill.gstAmount) || 0;
    const grandTotal = Number(bill.grandTotal) || Number(bill.total) || (subtotal + gstAmount);
    const paymentMode = bill.paymentMode || 'cash';
    const paymentLabel = paymentMode === 'cash' ? 'Cash' : paymentMode === 'upi' ? 'UPI' : paymentMode === 'card' ? 'Card' : paymentMode === 'bank_transfer' ? 'Bank Transfer' : paymentMode;
    const invoiceNo = bill.invoiceNumber || `INV-${Date.now()}`;
    const customerName = bill.customerName || 'Walk-in Customer';
    const isThermal = bill.format === 'thermal';

    const tmpDir = os.tmpdir();
    const filename = `invoice_${invoiceNo.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
    const filePath = path.join(tmpDir, filename);

    const pageWidth = isThermal ? 226 : 595.28;
    const pageHeight = isThermal ? 800 : 841.89;

    const doc = new PDFDocument({
        size: isThermal ? [pageWidth, pageHeight] : 'A4',
        margins: isThermal
            ? { top: 20, bottom: 20, left: 15, right: 15 }
            : { top: 40, bottom: 40, left: 50, right: 50 },
        autoFirstPage: true,
        bufferPages: true,
    });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const contentWidth = pageWidth - (isThermal ? 30 : 100);
    const primaryColor = '#1E40AF';
    const darkColor = '#1E293B';
    const greyColor = '#64748B';

    const fmt = (val: number) => {
        if (val === undefined || val === null || isNaN(val)) return '₹0.00';
        return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    if (isThermal) {
        let y = 20;
        doc.font('Helvetica-Bold').fontSize(14).fillColor(darkColor).text(shop.shopName.toUpperCase(), 15, y, { width: contentWidth, align: 'center' });
        y += 20;
        doc.font('Helvetica').fontSize(7).fillColor(greyColor);
        if (shop.address) { doc.text(shop.address, 15, y, { width: contentWidth, align: 'center' }); y += 10; }
        if (shop.phone) { doc.text(`Ph: ${shop.phone}`, 15, y, { width: contentWidth, align: 'center' }); y += 12; }

        // Dashed separator
        y += 3;
        for (let x = 15; x < pageWidth - 15; x += 4) { doc.moveTo(x, y).lineTo(x + 2, y).stroke('#CBD5E1'); }
        y += 8;

        doc.font('Helvetica').fontSize(7).fillColor(darkColor);
        doc.text(`Bill: ${invoiceNo}`, 15, y); doc.text(dateStr, 15, y, { width: contentWidth, align: 'right' }); y += 10;
        if (customerName !== 'Walk-in Customer') { doc.text(`Customer: ${customerName}`, 15, y); y += 10; }
        if (bill.customerPhone) { doc.text(`Ph: ${bill.customerPhone}`, 15, y); y += 12; }

        for (let x = 15; x < pageWidth - 15; x += 4) { doc.moveTo(x, y).lineTo(x + 2, y).stroke('#CBD5E1'); }
        y += 8;

        items.forEach(item => {
            const lineTotal = Number(item.price) * Number(item.quantity || 1);
            doc.font('Helvetica-Bold').fontSize(7).fillColor(darkColor).text(item.name, 15, y); y += 10;
            doc.font('Helvetica').fontSize(7).fillColor(greyColor);
            doc.text(`${item.quantity} x ${fmt(item.price)}`, 15, y);
            doc.text(fmt(lineTotal), 15, y, { width: contentWidth, align: 'right' });
            y += 12;
        });

        for (let x = 15; x < pageWidth - 15; x += 4) { doc.moveTo(x, y).lineTo(x + 2, y).stroke('#CBD5E1'); }
        y += 8;

        doc.font('Helvetica').fontSize(7).fillColor(greyColor);
        doc.text('Subtotal:', 15, y); doc.text(fmt(subtotal), 15, y, { width: contentWidth, align: 'right' }); y += 12;
        doc.text('GST:', 15, y); doc.text(fmt(gstAmount), 15, y, { width: contentWidth, align: 'right' }); y += 12;
        if (bill.couponDiscount) {
            doc.text('Discount:', 15, y); doc.text(`-${fmt(bill.couponDiscount)}`, 15, y, { width: contentWidth, align: 'right' }); y += 12;
        }

        y += 2;
        doc.rect(15, y, contentWidth, 22).fill('#1E293B');
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
        doc.text('TOTAL', 20, y + 5); doc.text(fmt(grandTotal), 20, y + 5, { width: contentWidth - 10, align: 'right' });
        y += 30;

        doc.font('Helvetica').fontSize(6).fillColor(greyColor).text(`Paid via ${paymentLabel}`, 15, y, { width: contentWidth, align: 'center' }); y += 10;
        doc.text(shop.footer || 'Thank you! Visit again!', 15, y, { width: contentWidth, align: 'center' });
    } else {
        // ═══════════════ A4 INVOICE ═══════════════
        let y = 40;

        doc.rect(0, 0, pageWidth, 12).fill(primaryColor);

        doc.rect(50, y, 48, 48).fillAndStroke(primaryColor, primaryColor);
        doc.font('Helvetica-Bold').fontSize(28).fillColor('#FFFFFF').text(shop.shopName.charAt(0).toUpperCase(), 50, y + 8, { width: 48, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(22).fillColor(darkColor).text(shop.shopName, 110, y + 4);
        doc.font('Helvetica').fontSize(8).fillColor(greyColor).text(shop.address, 110, y + 30);

        const detailsLines = [`${shop.phone}  |  ${shop.email}`];
        if (shop.gstNumber) detailsLines.push(`GSTIN: ${shop.gstNumber}`);
        doc.text(detailsLines.join('  |  '), 110, y + 42);

        doc.font('Helvetica-Bold').fontSize(28).fillColor(primaryColor).text('INVOICE', 0, y, { width: pageWidth - 50, align: 'right' });
        doc.font('Helvetica').fontSize(9).fillColor(greyColor).text(invoiceNo, 0, y + 32, { width: pageWidth - 50, align: 'right' });
        doc.text(`Date: ${dateStr}`, 0, y + 44, { width: pageWidth - 50, align: 'right' });

        y += 75;
        doc.moveTo(50, y).lineTo(pageWidth - 50, y).lineWidth(3).stroke(primaryColor);
        y += 20;

        doc.font('Helvetica-Bold').fontSize(7).fillColor(primaryColor).text('BILL TO', 50, y);
        doc.font('Helvetica-Bold').fontSize(7).fillColor(primaryColor).text('PAYMENT', 350, y);
        y += 14;
        doc.font('Helvetica-Bold').fontSize(12).fillColor(darkColor).text(customerName, 50, y);
        doc.font('Helvetica').fontSize(9).fillColor(greyColor).text(`Method: ${paymentLabel}`, 350, y);
        y += 16;
        doc.font('Helvetica').fontSize(9).fillColor(greyColor).text(bill.customerPhone || 'N/A', 50, y);
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#059669').text('PAID', 350, y);

        y += 30;

        // Items Table
        const tableLeft = 50;
        const tableRight = pageWidth - 50;
        const colWidths = [30, 180, 50, 55, 60, 50, 70];
        const colStarts = [tableLeft];
        for (let i = 1; i < colWidths.length; i++) {
            colStarts.push(colStarts[i - 1] + colWidths[i - 1]);
        }
        const headers = ['SL', 'DESCRIPTION', 'HSN', 'QTY', 'PRICE', 'GST', 'TOTAL'];

        doc.rect(tableLeft, y, tableRight - tableLeft, 28).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#FFFFFF');
        headers.forEach((h, i) => {
            const align = i >= 3 ? 'right' as const : 'left' as const;
            doc.text(h, colStarts[i] + 6, y + 9, { width: colWidths[i] - 12, align });
        });
        y += 28;

        items.forEach((item, idx) => {
            const rowH = 32;
            const lineTotal = Number(item.price) * Number(item.quantity || 1);

            if (idx % 2 === 0) {
                doc.rect(tableLeft, y, tableRight - tableLeft, rowH).fill('#F8FAFC');
            }

            doc.font('Helvetica').fontSize(8).fillColor(greyColor);
            doc.text(String(idx + 1).padStart(2, '0'), colStarts[0] + 6, y + 8, { width: colWidths[0] - 12 });

            doc.font('Helvetica-Bold').fontSize(8).fillColor(darkColor);
            doc.text(item.name, colStarts[1] + 6, y + 6, { width: colWidths[1] - 12 });
            doc.font('Helvetica').fontSize(6).fillColor(greyColor);
            doc.text(`${item.unit || 'PCS'}`, colStarts[1] + 6, y + 18, { width: colWidths[1] - 12 });

            doc.font('Helvetica').fontSize(8).fillColor(greyColor);
            doc.text(item.hsnCode || '-', colStarts[2] + 6, y + 10, { width: colWidths[2] - 12 });
            doc.text(String(item.quantity), colStarts[3] + 6, y + 10, { width: colWidths[3] - 12, align: 'right' });
            doc.text(fmt(item.price), colStarts[4] + 6, y + 10, { width: colWidths[4] - 12, align: 'right' });
            doc.text(`${item.gstRate || 0}%`, colStarts[5] + 6, y + 10, { width: colWidths[5] - 12, align: 'right' });

            doc.font('Helvetica-Bold').fontSize(8).fillColor(darkColor);
            doc.text(fmt(lineTotal), colStarts[6] + 6, y + 10, { width: colWidths[6] - 12, align: 'right' });

            y += rowH;
        });

        doc.moveTo(tableLeft, y).lineTo(tableRight, y).lineWidth(1).stroke('#E2E8F0');
        y += 20;

        // Totals
        const totalsX = 350;
        const totalsW = tableRight - totalsX;
        const totalsH = 110 + (bill.couponDiscount ? 18 : 0);

        doc.rect(totalsX, y, totalsW, totalsH).fill('#F8FAFC').stroke('#E2E8F0');
        let ty = y + 12;

        const drawRow = (label: string, value: string, bold = false, color = greyColor) => {
            doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8).fillColor(color);
            doc.text(label, totalsX + 15, ty, { width: 100 });
            doc.text(value, totalsX + 15, ty, { width: totalsW - 30, align: 'right' });
            ty += 18;
        };

        drawRow('Subtotal', fmt(subtotal));
        drawRow('CGST (9%)', fmt(gstAmount / 2));
        drawRow('SGST (9%)', fmt(gstAmount / 2));
        if (bill.couponDiscount) drawRow('Discount', `-${fmt(bill.couponDiscount)}`, false, '#059669');

        ty += 4;
        doc.moveTo(totalsX + 10, ty).lineTo(totalsX + totalsW - 10, ty).lineWidth(3).stroke(primaryColor);
        ty += 10;
        doc.font('Helvetica-Bold').fontSize(9).fillColor(primaryColor).text('GRAND TOTAL', totalsX + 15, ty);
        doc.font('Helvetica-Bold').fontSize(16).fillColor(darkColor).text(fmt(grandTotal), totalsX + 15, ty - 4, { width: totalsW - 30, align: 'right' });

        // Footer
        const footerY = pageHeight - 100;

        if (shop.signature) {
            doc.font('Helvetica-Bold').fontSize(14).fillColor(darkColor).text(shop.signature, 50, footerY - 15);
        }

        doc.rect(50, footerY, 150, 1).fill('#E2E8F0');
        doc.font('Helvetica').fontSize(7).fillColor(greyColor).text('Authorized Signature', 50, footerY + 5);
        doc.font('Helvetica-Bold').fontSize(12).fillColor(primaryColor).text(shop.shopName, 0, footerY - 5, { width: pageWidth - 50, align: 'right' });
        doc.font('Helvetica').fontSize(7).fillColor(greyColor).text(shop.footer || 'Thank you for your business!', 0, footerY + 10, { width: pageWidth - 50, align: 'right' });
    }

    doc.end();

    return new Promise<string>((resolve, reject) => {
        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
    });
}
