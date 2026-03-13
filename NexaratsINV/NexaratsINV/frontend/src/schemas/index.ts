import { z } from 'zod';

// Base ID schema
export const IdSchema = z.string().cuid().or(z.string().uuid()).or(z.string());

// Status Enums matching backend.md expectations
export const ProductStatusSchema = z.enum(['In Stock', 'Low Stock', 'Out of Stock']);
export const ReturnStatusSchema = z.enum(['Returnable', 'Not Returnable']);
export const TaxTypeSchema = z.enum(['Inclusive', 'Exclusive']);
export const PaymentMethodSchema = z.enum(['cash', 'upi', 'card', 'split', 'bank_transfer']);
export const OrderStatusSchema = z.enum(['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']);
export const PaymentStatusSchema = z.enum(['Paid', 'Unpaid', 'Partial']);

// Product Schema
export const ProductSchema = z.object({
    id: IdSchema,
    name: z.string().min(1, "Name is required"),
    sku: z.string().min(1, "SKU is required"),
    category: z.string().min(1, "Category is required"),
    price: z.number().positive(),
    purchasePrice: z.number().nonnegative(),
    stock: z.number().int(),
    gstRate: z.number().min(0).max(100),
    unit: z.string().default('Pieces'),
    status: ProductStatusSchema,
    image: z.string().optional().default(''),
    expiryDate: z.string().optional(),
    returns: ReturnStatusSchema.default('Returnable'),
    mrp: z.number().nonnegative().default(0),
    discountPercentage: z.number().min(0).max(100).default(0),
    profit: z.number().optional(),
    hsnCode: z.string().optional(),
    taxType: TaxTypeSchema.default('Inclusive'),
    minStock: z.number().int().default(5),
    description: z.string().optional(),
});

// Customer Schema
export const CustomerSchema = z.object({
    id: IdSchema,
    name: z.string().min(1, "Name is required"),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(10),
    totalPaid: z.number().nonnegative().default(0),
    pending: z.number().nonnegative().default(0),
    status: PaymentStatusSchema,
    lastTransaction: z.string().optional(),
    totalInvoices: z.number().int().nonnegative().default(0),
    address: z.string().optional(),
    channel: z.enum(['offline', 'online', 'both']).default('offline'),
});

// Vendor Schema
export const VendorSchema = z.object({
    id: IdSchema,
    name: z.string().min(1, "Name is required"),
    businessName: z.string().min(1, "Business name is required"),
    gstNumber: z.string().optional(),
    phone: z.string().min(10),
    email: z.string().email(),
    totalPaid: z.number().nonnegative().default(0),
    pendingAmount: z.number().nonnegative().default(0),
    lastTransaction: z.string().optional(),
    totalInvoices: z.number().int().nonnegative().default(0),
});

// Invoice Item Schema
export const InvoiceItemSchema = z.object({
    productId: IdSchema,
    quantity: z.number().int().positive(),
    price: z.number().positive(),
    gstAmount: z.number().nonnegative(),
    discount: z.number().nonnegative().default(0),
});

// Invoice / Transaction Schema
export const InvoiceSchema = z.object({
    id: IdSchema,
    number: z.string(),
    customerId: IdSchema.optional(),
    items: z.array(InvoiceItemSchema),
    subtotal: z.number().nonnegative(),
    gstTotal: z.number().nonnegative(),
    total: z.number().nonnegative(),
    method: PaymentMethodSchema,
    status: PaymentStatusSchema,
    date: z.string(),
    source: z.enum(['online', 'offline']).default('offline'),
});

// User Schema
export const UserSchema = z.object({
    id: IdSchema,
    name: z.string().min(1),
    email: z.string().email(),
    role: z.string(),
    permissions: z.record(z.string(), z.enum(['none', 'read', 'cru', 'manage'])),
});

export type ProductInput = z.infer<typeof ProductSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;
export type VendorInput = z.infer<typeof VendorSchema>;
export type InvoiceInput = z.infer<typeof InvoiceSchema>;
export type UserInput = z.infer<typeof UserSchema>;
