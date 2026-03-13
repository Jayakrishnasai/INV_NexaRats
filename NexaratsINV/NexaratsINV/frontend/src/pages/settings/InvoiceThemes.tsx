import React, { useState } from 'react';
import { Palette, Check, Save, CheckCircle2, Eye, X, Printer, FileText, Smartphone, Phone, Building2, MapPin, Mail, Receipt, Star, Zap, Crown, Sparkles, Monitor, ChevronDown, Image as ImageIcon, Shield } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { fireConfetti } from '../../utils/confettiInModal';
import Portal from '../../components/Portal';
import { api } from '../../services/api';

/* ─────────────────────────────── SAMPLE DATA ─────────────────────────────── */
const SAMPLE = {
    invoiceNo: 'INV-2026-00742',
    date: '08 Mar 2026',
    dueDate: '08 Apr 2026',
    customer: { name: 'Raj Sharma', phone: '+91 98765 43210', address: '45 MG Road, Bengaluru 560001', email: 'raj@email.com' },
    items: [
        { name: 'Samsung Galaxy S24 Ultra', hsn: '8517', qty: 1, price: 129999, gst: 23400 },
        { name: 'Apple AirPods Pro 2', hsn: '8518', qty: 2, price: 24900, gst: 4482 },
        { name: 'OnePlus Buds 3', hsn: '8518', qty: 1, price: 5499, gst: 990 },
        { name: 'Spigen Case Ultra Hybrid', hsn: '3926', qty: 3, price: 1299, gst: 234 },
        { name: 'Screen Protector Tempered', hsn: '7007', qty: 5, price: 499, gst: 90 },
    ],
};
const subtotal = SAMPLE.items.reduce((s, i) => s + i.price * i.qty, 0);
const totalGst = SAMPLE.items.reduce((s, i) => s + i.gst * i.qty, 0);
const grandTotal = subtotal + totalGst;

/* ─────────────────────────────── THEME DEFS ──────────────────────────────── */
interface ThemeDef {
    id: string;
    name: string;
    format: 'a4' | 'thermal';
    primary: string;
    accent: string;
    description: string;
    tag?: string;
}

const themes: ThemeDef[] = [
    // ── A4 Themes ──
    { id: 'classic_red', name: 'Classic Red', format: 'a4', primary: '#DC2626', accent: '#FEE2E2', description: 'Bold red header with clean table layout. Perfect for professional retail.', tag: 'Popular' },
    { id: 'corporate_blue', name: 'Corporate Blue', format: 'a4', primary: '#1E40AF', accent: '#DBEAFE', description: 'Navy blue corporate design with structured grid and payment info.' },
    { id: 'teal_modern', name: 'Teal Modern', format: 'a4', primary: '#0D9488', accent: '#CCFBF1', description: 'Fresh teal accents with geometric corner details and clean typography.' },
    { id: 'navy_marine', name: 'Navy Marine', format: 'a4', primary: '#1E293B', accent: '#E2E8F0', description: 'Premium navy design inspired by luxury shipping invoices.', tag: 'Premium' },
    { id: 'minimal_blue', name: 'Minimal Blue', format: 'a4', primary: '#2563EB', accent: '#EFF6FF', description: 'Ultra-clean minimal design with blue accent lines. Modern SaaS style.' },
    { id: 'dark_executive', name: 'Dark Executive', format: 'a4', primary: '#F59E0B', accent: '#1E293B', description: 'Dark charcoal background with gold accents. Premium luxury feel.', tag: 'Luxury' },
    // ── Thermal Themes ──
    { id: 'thermal_standard', name: 'Standard Receipt', format: 'thermal', primary: '#000000', accent: '#FFFFFF', description: 'Classic 58mm/80mm thermal receipt with dotted separators.' },
    { id: 'thermal_modern', name: 'Modern Receipt', format: 'thermal', primary: '#1E293B', accent: '#F1F5F9', description: 'Clean modern thermal design with rounded sections.' },
    { id: 'thermal_bold', name: 'Bold Receipt', format: 'thermal', primary: '#000000', accent: '#F8FAFC', description: 'Extra bold text with clear item separation. Easy to read.', tag: 'Best Seller' },
    { id: 'thermal_compact', name: 'Compact Receipt', format: 'thermal', primary: '#334155', accent: '#FFFFFF', description: 'Space-saving compact layout. Ideal for high-volume billing.' },
];

/* ═══════════════════════ A4 TEMPLATE RENDERERS ═══════════════════════════ */

const A4ClassicRed = ({ biz }: { biz: any }) => (
    <div className="font-sans text-[6px] leading-tight">
        <div className="flex justify-between items-start mb-3 pb-2 border-b-2" style={{ borderColor: '#DC2626' }}>
            <div>
                <div className="w-6 h-6 rounded bg-red-600 text-white flex items-center justify-center text-[8px] font-black mb-1">
                    {biz.businessName?.charAt(0) || 'N'}
                </div>
                <p className="font-black text-[8px] text-slate-900">{biz.businessName}</p>
                <p className="text-slate-400 text-[5px]">{biz.address}</p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-black text-red-600 tracking-wider">INVOICE</p>
                <p className="text-slate-500">{SAMPLE.invoiceNo}</p>
                <p className="text-slate-500">{SAMPLE.date}</p>
            </div>
        </div>
        <div className="mb-2 p-1.5 bg-red-50 rounded">
            <p className="text-[5px] font-black text-red-400 uppercase">Bill To</p>
            <p className="font-bold text-slate-900">{SAMPLE.customer.name}</p>
            <p className="text-slate-400">{SAMPLE.customer.phone}</p>
        </div>
        <table className="w-full mb-2">
            <thead><tr className="bg-red-600 text-white text-[5px] font-bold uppercase">
                <th className="px-1 py-0.5 text-left">Item</th>
                <th className="px-1 py-0.5 text-center">Qty</th>
                <th className="px-1 py-0.5 text-right">Price</th>
                <th className="px-1 py-0.5 text-right">Total</th>
            </tr></thead>
            <tbody>{SAMPLE.items.slice(0, 4).map((it, i) => (
                <tr key={i} className="border-b border-red-50">
                    <td className="px-1 py-0.5 font-bold text-slate-800">{it.name}</td>
                    <td className="px-1 py-0.5 text-center">{it.qty}</td>
                    <td className="px-1 py-0.5 text-right text-slate-500">₹{it.price.toLocaleString()}</td>
                    <td className="px-1 py-0.5 text-right font-bold">₹{(it.price * it.qty).toLocaleString()}</td>
                </tr>
            ))}</tbody>
        </table>
        <div className="flex justify-end">
            <div className="w-1/2 space-y-0.5 text-right">
                <div className="flex justify-between"><span className="text-slate-400">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">GST</span><span>₹{totalGst.toLocaleString()}</span></div>
                <div className="flex justify-between font-black text-[7px] pt-1 border-t border-red-600"><span>Total</span><span className="text-red-600">₹{grandTotal.toLocaleString()}</span></div>
            </div>
        </div>
        <div className="mt-2 pt-1 border-t text-[5px] text-slate-400 text-center">Thank you for your business!</div>
    </div>
);

const A4CorporateBlue = ({ biz }: { biz: any }) => (
    <div className="font-sans text-[6px] leading-tight">
        <div className="bg-blue-900 text-white p-2 rounded-t flex justify-between items-center mb-3">
            <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center font-black text-[7px]">{biz.businessName?.charAt(0) || 'N'}</div>
                <p className="font-black text-[8px] tracking-wide">{biz.businessName}</p>
            </div>
            <p className="text-[10px] font-black tracking-widest opacity-80">INVOICE</p>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="p-1.5 bg-blue-50 rounded"><p className="text-[5px] font-black text-blue-400 uppercase mb-0.5">From</p><p className="font-bold text-slate-800">{biz.businessName}</p><p className="text-slate-400">{biz.address}</p></div>
            <div className="p-1.5 bg-blue-50 rounded"><p className="text-[5px] font-black text-blue-400 uppercase mb-0.5">Bill To</p><p className="font-bold text-slate-800">{SAMPLE.customer.name}</p><p className="text-slate-400">{SAMPLE.customer.address}</p></div>
        </div>
        <div className="flex gap-4 mb-2 text-[5px]">
            <p><span className="font-black text-slate-400">Invoice:</span> {SAMPLE.invoiceNo}</p>
            <p><span className="font-black text-slate-400">Date:</span> {SAMPLE.date}</p>
            <p><span className="font-black text-slate-400">Due:</span> {SAMPLE.dueDate}</p>
        </div>
        <table className="w-full mb-2">
            <thead><tr className="bg-blue-900 text-white text-[5px] font-bold uppercase">
                <th className="px-1 py-0.5 text-left">Description</th>
                <th className="px-1 py-0.5 text-center">Qty</th>
                <th className="px-1 py-0.5 text-right">Rate</th>
                <th className="px-1 py-0.5 text-right">Amount</th>
            </tr></thead>
            <tbody>{SAMPLE.items.slice(0, 4).map((it, i) => (
                <tr key={i} className="border-b border-blue-50"><td className="px-1 py-0.5 font-bold">{it.name}</td><td className="px-1 py-0.5 text-center">{it.qty}</td><td className="px-1 py-0.5 text-right text-slate-500">₹{it.price.toLocaleString()}</td><td className="px-1 py-0.5 text-right font-bold">₹{(it.price * it.qty).toLocaleString()}</td></tr>
            ))}</tbody>
        </table>
        <div className="flex justify-end"><div className="bg-blue-900 text-white px-3 py-1.5 rounded text-[7px] font-black">Total: ₹{grandTotal.toLocaleString()}</div></div>
    </div>
);

const A4TealModern = ({ biz }: { biz: any }) => (
    <div className="font-sans text-[6px] leading-tight relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-teal-500 rounded-t" />
        <div className="pt-3 flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-teal-500 rounded-lg text-white flex items-center justify-center font-black text-[9px]">{biz.businessName?.charAt(0) || 'N'}</div>
                <div><p className="font-black text-[9px] text-slate-900">{biz.businessName}</p><p className="text-[5px] text-slate-400">{biz.address}</p></div>
            </div>
            <div className="text-right"><p className="text-[5px] text-slate-400">Invoice No</p><p className="font-black text-[7px]">{SAMPLE.invoiceNo}</p><p className="text-slate-400">Date: {SAMPLE.date}</p></div>
        </div>
        <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="p-1.5 border border-teal-100 rounded-lg"><p className="text-[5px] font-black text-teal-500 uppercase">Invoice From</p><p className="font-bold">{biz.businessName}</p></div>
            <div className="p-1.5 border border-teal-100 rounded-lg"><p className="text-[5px] font-black text-teal-500 uppercase">Invoice To</p><p className="font-bold">{SAMPLE.customer.name}</p></div>
        </div>
        <table className="w-full mb-2">
            <thead><tr className="text-[5px] font-black text-teal-600 uppercase border-b-2 border-teal-500">
                <th className="px-1 py-1 text-left">Item Name</th><th className="px-1 py-1 text-center">Qty</th><th className="px-1 py-1 text-right">Price</th><th className="px-1 py-1 text-right">Total</th>
            </tr></thead>
            <tbody>{SAMPLE.items.slice(0, 4).map((it, i) => (
                <tr key={i} className="border-b border-slate-100"><td className="px-1 py-0.5 font-bold">{it.name}</td><td className="px-1 py-0.5 text-center">{it.qty}</td><td className="px-1 py-0.5 text-right text-slate-500">₹{it.price.toLocaleString()}</td><td className="px-1 py-0.5 text-right font-bold">₹{(it.price * it.qty).toLocaleString()}</td></tr>
            ))}</tbody>
        </table>
        <div className="flex justify-between items-end">
            <div className="text-[5px] text-slate-400"><p className="font-black text-teal-500 mb-0.5">Payment Info</p><p>Bank: HDFC Bank</p><p>A/C: 1234567890</p></div>
            <div className="text-right space-y-0.5"><div className="flex justify-between gap-4"><span className="text-slate-400">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div><div className="flex justify-between gap-4"><span className="text-slate-400">Tax</span><span>₹{totalGst.toLocaleString()}</span></div><div className="flex justify-between gap-4 font-black text-[7px] pt-1 border-t-2 border-teal-500"><span>Grand Total</span><span className="text-teal-600">₹{grandTotal.toLocaleString()}</span></div></div>
        </div>
    </div>
);

const A4NavyMarine = ({ biz }: { biz: any }) => (
    <div className="font-sans text-[6px] leading-tight">
        <div className="flex mb-3"><div className="w-1/3 bg-slate-800 p-2 rounded-l"><p className="text-[5px] text-slate-400 uppercase mb-0.5">From</p><p className="text-white font-black text-[7px]">{biz.businessName}</p><p className="text-slate-400 text-[5px]">{biz.address}</p></div><div className="flex-1 p-2 bg-slate-50 rounded-r flex justify-between items-start"><div><p className="text-[5px] text-slate-400 uppercase">Billed To</p><p className="font-bold text-[7px]">{SAMPLE.customer.name}</p><p className="text-slate-400">{SAMPLE.customer.address}</p></div><div className="text-right"><p className="text-slate-800 font-black text-[10px] tracking-wider">INVOICE</p><p className="text-[5px] text-slate-400">Ref: {SAMPLE.invoiceNo}</p><p className="text-[5px] text-slate-400">{SAMPLE.date}</p></div></div></div>
        <table className="w-full mb-2 rounded overflow-hidden">
            <thead><tr className="bg-slate-800 text-white text-[5px] font-bold uppercase"><th className="px-1.5 py-1 text-left">No.</th><th className="px-1.5 py-1 text-left">Description</th><th className="px-1.5 py-1 text-center">Quantity</th><th className="px-1.5 py-1 text-right">Unit Price</th><th className="px-1.5 py-1 text-right">Amount</th></tr></thead>
            <tbody>{SAMPLE.items.map((it, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-slate-50' : ''}><td className="px-1.5 py-0.5 text-slate-400">{String(i + 1).padStart(2, '0')}</td><td className="px-1.5 py-0.5 font-bold">{it.name}</td><td className="px-1.5 py-0.5 text-center">{it.qty}</td><td className="px-1.5 py-0.5 text-right text-slate-500">₹{it.price.toLocaleString()}</td><td className="px-1.5 py-0.5 text-right font-bold">₹{(it.price * it.qty).toLocaleString()}</td></tr>
            ))}</tbody>
        </table>
        <div className="flex justify-end"><div className="w-1/2"><div className="flex justify-between mb-0.5"><span className="text-slate-400">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div><div className="flex justify-between mb-0.5"><span className="text-slate-400">Tax (GST)</span><span>₹{totalGst.toLocaleString()}</span></div><div className="flex justify-between font-black bg-slate-800 text-white px-2 py-1 rounded text-[7px]"><span>Amount Due</span><span>₹{grandTotal.toLocaleString()}</span></div></div></div>
    </div>
);

const A4MinimalBlue = ({ biz }: { biz: any }) => (
    <div className="font-sans text-[6px] leading-tight">
        <div className="flex justify-between items-start mb-3">
            <div><div className="flex items-center gap-1 mb-1"><div className="w-5 h-5 bg-blue-600 text-white rounded-md flex items-center justify-center font-black text-[7px]">{biz.businessName?.charAt(0) || 'N'}</div><p className="font-black text-[9px] text-blue-600">{biz.businessName}</p></div><p className="text-slate-400 text-[5px]">{biz.phone} | {biz.email}</p></div>
            <div className="text-right"><p className="text-[5px] text-slate-400">Invoice no.</p><p className="font-bold">{SAMPLE.invoiceNo}</p><p className="text-[5px] text-slate-400 mt-0.5">Invoice date: {SAMPLE.date}</p><p className="text-[5px] text-slate-400">Due: {SAMPLE.dueDate}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2 text-[5px]"><div><p className="font-black text-slate-900">From</p><p className="text-slate-500">{biz.businessName}<br />{biz.address}</p></div><div className="text-right"><p className="font-black text-slate-900">Bill to</p><p className="text-slate-500">{SAMPLE.customer.name}<br />{SAMPLE.customer.address}</p></div></div>
        <table className="w-full mb-2">
            <thead><tr className="bg-blue-600 text-white text-[5px] font-bold uppercase rounded"><th className="px-1 py-0.5 text-left rounded-l">Description</th><th className="px-1 py-0.5 text-center">Rate</th><th className="px-1 py-0.5 text-center">Qty</th><th className="px-1 py-0.5 text-center">Tax</th><th className="px-1 py-0.5 text-right rounded-r">Amount</th></tr></thead>
            <tbody>{SAMPLE.items.slice(0, 4).map((it, i) => (<tr key={i} className="border-b border-blue-50"><td className="px-1 py-0.5">{it.name}</td><td className="px-1 py-0.5 text-center text-slate-500">₹{it.price.toLocaleString()}</td><td className="px-1 py-0.5 text-center">{it.qty}</td><td className="px-1 py-0.5 text-center text-slate-400">18%</td><td className="px-1 py-0.5 text-right font-bold">₹{(it.price * it.qty).toLocaleString()}</td></tr>))}</tbody>
        </table>
        <div className="flex justify-end"><div className="w-1/2 text-right space-y-0.5"><div className="flex justify-between"><span className="text-slate-400">Subtotal:</span><span>₹{subtotal.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-slate-400">Sales Tax:</span><span>₹{totalGst.toLocaleString()}</span></div><div className="flex justify-between font-black text-[7px] pt-1 border-t border-blue-600"><span className="text-blue-600">Total:</span><span>₹{grandTotal.toLocaleString()}</span></div></div></div>
    </div>
);

const A4DarkExecutive = ({ biz }: { biz: any }) => (
    <div className="font-sans text-[6px] leading-tight bg-slate-800 text-white p-3 rounded-lg">
        <div className="flex justify-between items-start mb-3 pb-2 border-b border-white/10">
            <div><p className="text-[5px] font-black text-amber-400 uppercase tracking-wider">Invoice</p><p className="font-black text-[9px]">{biz.businessName}</p></div>
            <div className="text-right"><p className="text-white/40 text-[5px]">{SAMPLE.invoiceNo}</p><p className="text-white/40 text-[5px]">{SAMPLE.date}</p><div className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[5px] font-black mt-1 inline-block">₹{grandTotal.toLocaleString()}</div></div>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2 text-[5px]"><div className="p-1.5 bg-white/5 rounded"><p className="text-amber-400 font-black text-[4px] uppercase mb-0.5">Billed To</p><p className="font-bold">{SAMPLE.customer.name}</p><p className="text-white/40">{SAMPLE.customer.phone}</p></div><div className="p-1.5 bg-white/5 rounded text-right"><p className="text-amber-400 font-black text-[4px] uppercase mb-0.5">Payment</p><p className="font-bold">UPI / Card</p><p className="text-emerald-400 font-black">PAID</p></div></div>
        {SAMPLE.items.slice(0, 3).map((it, i) => (<div key={i} className="flex justify-between items-center py-1 border-b border-white/5"><div><p className="font-bold">{it.name}</p><p className="text-white/30 text-[5px]">Qty: {it.qty} | HSN: {it.hsn}</p></div><p className="font-black text-amber-400">₹{(it.price * it.qty).toLocaleString()}</p></div>))}
        <div className="mt-2 pt-1 border-t border-amber-500/30 flex justify-between font-black text-[7px]"><span className="text-amber-400">GRAND TOTAL</span><span>₹{grandTotal.toLocaleString()}</span></div>
    </div>
);

/* ═══════════════════════ THERMAL TEMPLATE RENDERERS ═══════════════════════ */
const ThermalStandard = ({ biz }: { biz: any }) => (
    <div className="font-mono text-[6px] leading-tight text-center">
        <p className="font-black text-[8px]">{biz.businessName}</p>
        <p className="text-[5px] text-slate-500">{biz.address}</p>
        <p className="text-[5px] text-slate-500">Ph: {biz.phone}</p>
        <div className="border-t border-dashed border-slate-300 my-1" />
        <div className="flex justify-between text-[5px]"><span>Bill: {SAMPLE.invoiceNo}</span><span>{SAMPLE.date}</span></div>
        <p className="text-left text-[5px]">Customer: {SAMPLE.customer.name}</p>
        <div className="border-t border-dashed border-slate-300 my-1" />
        <div className="text-left text-[5px] font-black flex justify-between"><span>ITEM</span><span>QTY  PRICE   AMT</span></div>
        <div className="border-t border-dashed border-slate-300 my-0.5" />
        {SAMPLE.items.slice(0, 4).map((it, i) => (<div key={i} className="text-left text-[5px] flex justify-between"><span className="truncate max-w-[60%]">{it.name}</span><span className="text-right">{it.qty} x{it.price} = ₹{(it.price * it.qty).toLocaleString()}</span></div>))}
        <div className="border-t border-dashed border-slate-300 my-1" />
        <div className="text-left text-[5px] space-y-0.5"><div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toLocaleString()}</span></div><div className="flex justify-between"><span>Tax (GST):</span><span>₹{totalGst.toLocaleString()}</span></div></div>
        <div className="border-t border-double border-slate-400 my-1" />
        <div className="flex justify-between font-black text-[7px]"><span>TOTAL</span><span>₹{grandTotal.toLocaleString()}</span></div>
        <div className="border-t border-dashed border-slate-300 my-1" />
        <p className="text-[5px] text-slate-400">Thank you! Visit again!</p>
    </div>
);

const ThermalModern = ({ biz }: { biz: any }) => (
    <div className="font-sans text-[6px] leading-tight text-center">
        <div className="bg-slate-800 text-white rounded py-1.5 px-2 mb-2"><p className="font-black text-[8px]">{biz.businessName}</p><p className="text-[5px] opacity-60">{biz.phone}</p></div>
        <div className="text-left bg-slate-50 rounded p-1.5 mb-2"><div className="flex justify-between text-[5px]"><span className="text-slate-400">Invoice</span><span className="font-bold">{SAMPLE.invoiceNo}</span></div><div className="flex justify-between text-[5px]"><span className="text-slate-400">Date</span><span className="font-bold">{SAMPLE.date}</span></div></div>
        {SAMPLE.items.slice(0, 3).map((it, i) => (<div key={i} className="flex justify-between text-left text-[5px] py-0.5 border-b border-slate-100"><div className="truncate max-w-[60%]"><p className="font-bold">{it.name}</p><p className="text-slate-400">{it.qty} × ₹{it.price.toLocaleString()}</p></div><p className="font-black">₹{(it.price * it.qty).toLocaleString()}</p></div>))}
        <div className="bg-slate-800 text-white rounded mt-2 py-1.5 px-2 flex justify-between text-[7px] font-black"><span>TOTAL</span><span>₹{grandTotal.toLocaleString()}</span></div>
    </div>
);

const ThermalBold = ({ biz }: { biz: any }) => (
    <div className="font-mono text-[6px] leading-tight">
        <div className="text-center mb-2"><p className="font-black text-[9px] uppercase">{biz.businessName}</p><div className="h-0.5 bg-black my-1" /><p className="text-[5px] text-slate-500">{biz.address}</p></div>
        <div className="flex justify-between text-[5px] mb-1 font-black"><span>{SAMPLE.invoiceNo}</span><span>{SAMPLE.date}</span></div>
        <div className="h-0.5 bg-black mb-1" />
        {SAMPLE.items.slice(0, 4).map((it, i) => (<div key={i} className="mb-1"><p className="font-black text-[6px]">{it.name}</p><div className="flex justify-between text-[5px]"><span className="text-slate-500">{it.qty} × ₹{it.price.toLocaleString()}</span><span className="font-black">₹{(it.price * it.qty).toLocaleString()}</span></div></div>))}
        <div className="h-1 bg-black my-1" />
        <div className="flex justify-between font-black text-[8px]"><span>TOTAL</span><span>₹{grandTotal.toLocaleString()}</span></div>
        <div className="h-0.5 bg-black mt-1 mb-1" />
        <p className="text-center text-[5px] text-slate-400 font-black uppercase">*** Thank You ***</p>
    </div>
);

const ThermalCompact = ({ biz }: { biz: any }) => (
    <div className="font-sans text-[5px] leading-tight">
        <div className="text-center mb-1"><p className="font-black text-[7px]">{biz.businessName}</p><p className="text-slate-400">{biz.phone}</p></div>
        <div className="border-t border-slate-200 my-0.5" />
        <div className="flex justify-between text-[4px] text-slate-400"><span>{SAMPLE.invoiceNo}</span><span>{SAMPLE.date}</span></div>
        <div className="border-t border-slate-200 my-0.5" />
        {SAMPLE.items.slice(0, 5).map((it, i) => (<div key={i} className="flex justify-between py-px"><span className="truncate max-w-[65%]">{it.name}</span><span className="font-bold">₹{(it.price * it.qty).toLocaleString()}</span></div>))}
        <div className="border-t border-slate-300 my-0.5" />
        <div className="flex justify-between text-[4px]"><span>Sub</span><span>₹{subtotal.toLocaleString()}</span></div>
        <div className="flex justify-between text-[4px]"><span>Tax</span><span>₹{totalGst.toLocaleString()}</span></div>
        <div className="bg-slate-900 text-white rounded px-1.5 py-0.5 flex justify-between font-black text-[6px] mt-0.5"><span>PAY</span><span>₹{grandTotal.toLocaleString()}</span></div>
    </div>
);

/* ═══════════════════════ RENDER MAP ═══════════════════════════════════════ */
const thumbnailMap: Record<string, React.FC<{ biz: any }>> = {
    classic_red: A4ClassicRed,
    corporate_blue: A4CorporateBlue,
    teal_modern: A4TealModern,
    navy_marine: A4NavyMarine,
    minimal_blue: A4MinimalBlue,
    dark_executive: A4DarkExecutive,
    thermal_standard: ThermalStandard,
    thermal_modern: ThermalModern,
    thermal_bold: ThermalBold,
    thermal_compact: ThermalCompact,
};

/* ═══════════════════════════ FULL PREVIEW RENDERERS ═══════════════════════ */
const FullPreview: React.FC<{ theme: ThemeDef; biz: any }> = ({ theme, biz }) => {
    const isThermal = theme.format === 'thermal';
    return (
        <div className={`${isThermal ? 'max-w-sm mx-auto' : ''}`}>
            <div className={`${isThermal ? 'font-mono' : 'font-sans'} text-sm leading-relaxed`}>
                {/* Header */}
                <div className={`${isThermal ? 'text-center' : 'flex justify-between items-start'} mb-8 pb-6 border-b-2`} style={{ borderColor: theme.primary }}>
                    {isThermal ? (
                        <div className="space-y-2">
                            <p className="font-black text-2xl uppercase">{biz.businessName}</p>
                            <p className="text-xs text-slate-500">{biz.address}</p>
                            <p className="text-xs text-slate-500">Ph: {biz.phone}</p>
                            <div className="border-t border-dashed border-slate-300 pt-2 mt-2">
                                <div className="flex justify-between text-xs"><span>Bill: {SAMPLE.invoiceNo}</span><span>{SAMPLE.date}</span></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl font-black" style={{ backgroundColor: theme.primary }}>{biz.businessName?.charAt(0) || 'N'}</div>
                                <div><p className="font-black text-2xl text-slate-900">{biz.businessName}</p><p className="text-xs text-slate-400">{biz.address}</p><p className="text-xs text-slate-400">{biz.phone} | {biz.email}</p></div>
                            </div>
                            <div className="text-right"><p className="text-3xl font-black uppercase tracking-wider" style={{ color: theme.primary }}>INVOICE</p><p className="text-sm text-slate-500">{SAMPLE.invoiceNo}</p><p className="text-sm text-slate-500">Date: {SAMPLE.date}</p></div>
                        </>
                    )}
                </div>
                {/* Customer */}
                <div className={`${isThermal ? '' : 'grid grid-cols-2 gap-6'} mb-6`}>
                    <div className="p-4 rounded-xl" style={{ backgroundColor: theme.accent + '30' }}>
                        <p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: theme.primary }}>Bill To</p>
                        <p className="font-bold text-lg">{SAMPLE.customer.name}</p>
                        <p className="text-sm text-slate-500">{SAMPLE.customer.address}</p>
                        <p className="text-sm text-slate-500">{SAMPLE.customer.phone}</p>
                    </div>
                    {!isThermal && <div className="p-4"><p className="text-xs font-black uppercase tracking-wider mb-1" style={{ color: theme.primary }}>Payment Details</p><p className="text-sm text-slate-600">Method: UPI / Card</p><p className="text-sm text-slate-600">Due: {SAMPLE.dueDate}</p><p className="text-sm font-bold text-emerald-600">Status: PAID</p></div>}
                </div>
                {/* Table */}
                {isThermal ? (
                    <div className="space-y-2 mb-6">
                        <div className="border-t border-dashed border-slate-300 pt-2" />
                        {SAMPLE.items.map((it, i) => (
                            <div key={i} className="pb-2 border-b border-dashed border-slate-200">
                                <p className="font-bold">{it.name}</p>
                                <div className="flex justify-between text-xs text-slate-500"><span>{it.qty} × ₹{it.price.toLocaleString()}</span><span className="font-black text-slate-900">₹{(it.price * it.qty).toLocaleString()}</span></div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <table className="w-full mb-6">
                        <thead>
                            <tr className="text-xs font-black uppercase text-white" style={{ backgroundColor: theme.primary }}>
                                <th className="px-4 py-3 text-left rounded-l-lg">SL</th><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-center">HSN</th><th className="px-4 py-3 text-center">Qty</th><th className="px-4 py-3 text-right">Price</th><th className="px-4 py-3 text-right rounded-r-lg">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SAMPLE.items.map((it, i) => (
                                <tr key={i} className={`border-b ${i % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                                    <td className="px-4 py-3 text-slate-400">{String(i + 1).padStart(2, '0')}</td>
                                    <td className="px-4 py-3 font-bold">{it.name}</td>
                                    <td className="px-4 py-3 text-center text-slate-400">{it.hsn}</td>
                                    <td className="px-4 py-3 text-center">{it.qty}</td>
                                    <td className="px-4 py-3 text-right text-slate-500">₹{it.price.toLocaleString()}</td>
                                    <td className="px-4 py-3 text-right font-black">₹{(it.price * it.qty).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                {/* Totals */}
                <div className={`${isThermal ? '' : 'flex justify-end'}`}>
                    <div className={`${isThermal ? 'w-full' : 'w-72'} space-y-2`}>
                        <div className="flex justify-between text-sm"><span className="text-slate-400">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-400">GST (18%)</span><span>₹{totalGst.toLocaleString()}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-slate-400">Discount</span><span>₹0</span></div>
                        <div className={`flex justify-between font-black text-xl pt-3 mt-2 border-t-2`} style={{ borderColor: theme.primary }}>
                            <span style={{ color: theme.primary }}>Grand Total</span>
                            <span>₹{grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
                {/* Footer */}
                <div className="mt-8 pt-4 border-t text-center text-xs text-slate-400">
                    <p>Thank you for your business!</p>
                    <p className="mt-1">Terms: Payment is due within 30 days.</p>
                </div>
            </div>
        </div>
    );
};

/* ═══════════════════════════ MAIN COMPONENT ══════════════════════════════ */
const InvoiceThemes: React.FC = () => {
    const [selectedTheme, setSelectedTheme] = useLocalStorage('nx_invoice_theme', 'classic_red');
    const [onlineTheme, setOnlineTheme] = useLocalStorage('nx_online_theme', 'classic_red');
    const [editingMode, setEditingMode] = useState<'offline' | 'online'>('offline');

    const [config, setConfig] = useLocalStorage('nx_invoice_config', {
        showLogo: true, showGST: true, showTerms: true,
        termsText: 'Payment is due within 30 days. Late payments may incur additional charges.',
        footerText: 'Thank you for your business!',
    });
    const [saved, setSaved] = useState(false);
    const [previewTheme, setPreviewTheme] = useState<ThemeDef | null>(null);
    const [formatFilter, setFormatFilter] = useState<'all' | 'a4' | 'thermal'>('all');
    const [adminProfile] = useLocalStorage('inv_admin_profile', {
        businessName: 'NexaRats Store', address: '123 Business Street, New Delhi', phone: '9876543210', email: 'contact@nexarats.com', avatar: ''
    });

    const handleSave = async (overrideTheme?: string, overrideConfig?: any) => {
        const activeThemeValue = overrideTheme || (editingMode === 'online' ? onlineTheme : selectedTheme);
        const configToSave = overrideConfig || config;

        // Note: we save both themes on save
        const savePayload: any = {
            nx_invoice_config: configToSave,
            nx_invoice_theme: selectedTheme,
            nx_online_theme: onlineTheme,
        };

        if (overrideTheme) {
            if (editingMode === 'online') savePayload.nx_online_theme = overrideTheme;
            else savePayload.nx_invoice_theme = overrideTheme;
        }

        try {
            await api.settings.update(savePayload);
            setSaved(true);
            fireConfetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#8B5CF6', '#2563EB'] });
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Failed to save invoice settings to DB', err);
            alert('Failed to save settings to database');
        }
    };

    const filteredThemes = formatFilter === 'all' ? themes : themes.filter(t => t.format === formatFilter);

    const activeThemeId = editingMode === 'online' ? onlineTheme : selectedTheme;
    const setActiveThemeId = (id: string) => editingMode === 'online' ? setOnlineTheme(id) : setSelectedTheme(id);

    return (
        <div className="w-full space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-200">
                        <Palette className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black text-slate-900">Invoice Themes</h2>
                        <p className="text-xs text-slate-400 font-bold">Choose your invoice design for A4 printing & thermal receipts</p>
                    </div>
                </div>
                <button
                    onClick={() => handleSave()}
                    className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-lg shadow-blue-200`}
                >
                    {saved ? <CheckCircle2 className="w-4 h-4 animate-in zoom-in" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{saved ? 'Saved!' : 'Save Theme'}</span>
                </button>
            </div>

            {/* Mode Toggle & Format Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                    <button onClick={() => setEditingMode('offline')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${editingMode === 'offline' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>POS Bills (Offline)</button>
                    <button onClick={() => setEditingMode('online')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${editingMode === 'online' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Online Orders</button>
                </div>

                <div className="flex items-center gap-2">
                    {[
                        { id: 'all' as const, label: 'All Templates', icon: Sparkles, count: themes.length },
                        { id: 'a4' as const, label: 'A4 Sheet', icon: FileText, count: themes.filter(t => t.format === 'a4').length },
                        { id: 'thermal' as const, label: 'Thermal Printer', icon: Receipt, count: themes.filter(t => t.format === 'thermal').length },
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFormatFilter(f.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${formatFilter === f.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}
                        >
                            <f.icon className="w-3.5 h-3.5" />
                            {f.label}
                            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${formatFilter === f.id ? 'bg-white/20' : 'bg-slate-200'}`}>{f.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredThemes.map(theme => {
                    const isActive = activeThemeId === theme.id;
                    const Thumb = thumbnailMap[theme.id];
                    return (
                        <div
                            key={theme.id}
                            onClick={() => setActiveThemeId(theme.id)}
                            className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${isActive ? 'ring-2 ring-blue-600 ring-offset-2 shadow-xl shadow-blue-100' : 'border border-slate-100 hover:border-blue-200 hover:shadow-lg shadow-sm'}`}
                        >
                            {/* Tag */}
                            {theme.tag && (
                                <div className="absolute top-2 left-2 z-10">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${theme.tag === 'Popular' ? 'bg-amber-100 text-amber-700' : theme.tag === 'Premium' ? 'bg-purple-100 text-purple-700' : theme.tag === 'Luxury' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {theme.tag === 'Popular' && <Star className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
                                        {theme.tag === 'Premium' && <Crown className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
                                        {theme.tag === 'Luxury' && <Sparkles className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
                                        {theme.tag === 'Best Seller' && <Zap className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
                                        {theme.tag}
                                    </span>
                                </div>
                            )}

                            {/* Active badge */}
                            {isActive && (
                                <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                            )}

                            {/* Thumbnail - fixed aspect */}
                            <div className={`p-3 ${theme.format === 'thermal' ? 'bg-gray-50' : 'bg-slate-50'} ${theme.format === 'thermal' ? 'flex justify-center' : ''}`}>
                                <div className={`bg-white shadow-sm border border-slate-100 ${theme.format === 'thermal' ? 'w-28 p-2 mx-auto min-h-[160px]' : 'p-2.5 min-h-[160px]'} rounded-lg overflow-hidden`}>
                                    {Thumb && <Thumb biz={adminProfile} />}
                                </div>
                            </div>

                            {/* Info */}
                            <div className="p-3 bg-white">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${theme.format === 'a4' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                        {theme.format === 'a4' ? <><Monitor className="w-2.5 h-2.5 inline mr-0.5 -mt-px" /> A4</> : <><Printer className="w-2.5 h-2.5 inline mr-0.5 -mt-px" /> Thermal</>}
                                    </span>
                                    <h4 className="font-black text-sm text-slate-900 truncate">{theme.name}</h4>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold line-clamp-2 mb-2">{theme.description}</p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setPreviewTheme(theme); }}
                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                    >
                                        <Eye className="w-3 h-3" /> Preview
                                    </button>
                                    {isActive ? (
                                        <div className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider">
                                            <CheckCircle2 className="w-3 h-3" /> Active
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveThemeId(theme.id); handleSave(theme.id); }}
                                            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                                        >
                                            Apply
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Divider */}
            <hr className="border-slate-100" />

            {/* Invoice Configuration Box */}
            <div className="space-y-4">
                <h3 className="text-sm font-black text-slate-600 uppercase tracking-widest px-1">
                    <Zap className="w-3.5 h-3.5 text-blue-500 inline mr-1" /> Invoice Configuration
                </h3>
                <div className="w-full p-5 lg:p-6 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                    {[
                        { key: 'showLogo', label: 'Show Business Logo', desc: 'Display your logo on printed invoices', icon: ImageIcon },
                        { key: 'showGST', label: 'Show GST Breakdown', desc: 'Include split (CGST/SGST/IGST)', icon: Shield },
                        { key: 'showTerms', label: 'Show Terms & Conditions', desc: 'Print terms at footer of documents', icon: FileText },
                    ].map(item => (
                        <div key={item.key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-blue-100 transition-all shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                    <item.icon className="w-4 h-4 text-slate-400" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-slate-900 leading-none mb-1">{item.label}</p>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{item.desc}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setConfig(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(config as any)[item.key] ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${(config as any)[item.key] ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <hr className="border-slate-100" />

            {/* Custom Text */}
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Terms & Conditions</label>
                    <textarea value={config.termsText} onChange={(e) => setConfig({ ...config, termsText: e.target.value })} rows={3} className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl outline-none resize-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                </div>
                <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Footer Text</label>
                    <input value={config.footerText} onChange={(e) => setConfig({ ...config, footerText: e.target.value })} className="w-full mt-2 px-4 py-3 border border-slate-200 rounded-xl outline-none text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                </div>
            </div>

            {/* Full Preview Modal */}
            {previewTheme && (
                <Portal>
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[9999] flex items-center justify-center p-4 lg:p-8 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[24px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative">
                            {/* Modal Header */}
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: previewTheme.primary + '20' }}>
                                        {previewTheme.format === 'thermal' ? <Receipt className="w-4 h-4" style={{ color: previewTheme.primary }} /> : <FileText className="w-4 h-4" style={{ color: previewTheme.primary }} />}
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 leading-tight">{previewTheme.name}</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                            {previewTheme.format === 'a4' ? <><Monitor className="w-3 h-3" /> A4 Sheet Preview</> : <><Printer className="w-3 h-3" /> Thermal Printer Preview</>}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => setPreviewTheme(null)} className="p-3 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><X className="w-4 h-4" /></button>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6 lg:p-10 bg-slate-100/50">
                                <div className={`bg-white shadow-xl mx-auto border border-slate-200 rounded-lg ${previewTheme.format === 'thermal' ? 'max-w-sm p-6' : 'max-w-3xl p-8 lg:p-12'}`}>
                                    <FullPreview theme={previewTheme} biz={adminProfile} />
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                                <p className="text-xs text-slate-400 font-bold">
                                    {previewTheme.format === 'a4' ? 'Prints on standard A4 paper (210 × 297 mm)' : 'Prints on 58mm / 80mm thermal rolls'}
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setPreviewTheme(null)} className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-all text-sm">Close</button>
                                    <button
                                        onClick={() => { setActiveThemeId(previewTheme.id); setPreviewTheme(null); handleSave(previewTheme.id); }}
                                        className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all text-sm uppercase tracking-wider flex items-center gap-2"
                                    >
                                        <Check className="w-3.5 h-3.5" /> Apply Theme
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Portal>
            )}
        </div>
    );
};

export default InvoiceThemes;
