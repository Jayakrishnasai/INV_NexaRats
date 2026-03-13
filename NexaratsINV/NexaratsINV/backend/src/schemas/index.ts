import { z } from 'zod';

// ─── Shared Enums ──────────────────────────────────────────────────────────────
export const ProductStatusSchema = z.enum(['In Stock', 'Low Stock', 'Out of Stock']);
export const TaxTypeSchema = z.enum(['Inclusive', 'Exclusive']);
export const ReturnStatusSchema = z.enum(['Returnable', 'Not Returnable']);
export const PaymentMethodSchema = z.enum(['cash', 'upi', 'card', 'split', 'bank_transfer']);
export const OrderStatusSchema = z.enum(['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled']);
export const PaymentStatusSchema = z.enum(['Paid', 'Unpaid', 'Partial']);
export const AccessLevelSchema = z.enum(['manage', 'cru', 'read', 'none']);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export const RefreshSchema = z.object({
    refreshToken: z.string().min(1),
});

// ─── SaaS Signup ──────────────────────────────────────────────────────────────
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*])/;

export const SignupSchema = z.object({
    orgName: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(PASSWORD_REGEX, 'Password must contain at least one number and one special character'),
    planId: z.string().uuid('Invalid plan ID').optional(),
    billingCycle: z.enum(['monthly', 'annual']).default('monthly'),
});

export const ForgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const ResetPasswordSchema = z.object({
    token: z.string().min(1),
    password: z
        .string()
        .min(8)
        .regex(PASSWORD_REGEX, 'Password must contain at least one number and one special character'),
});

// ─── Razorpay Key Management ──────────────────────────────────────────────────
export const RazorpayKeySchema = z.object({
    keyId: z.string().startsWith('rzp_', 'Key ID must start with rzp_'),
    keySecret: z.string().min(20, 'Key secret appears too short to be valid'),
});

// ─── Product ──────────────────────────────────────────────────────────────────
export const ProductCreateSchema = z.object({
    name: z.string().min(1),
    sku: z.string().min(1),
    category: z.string().min(1),
    price: z.number().nonnegative(),
    purchasePrice: z.number().nonnegative(),
    mrp: z.number().nonnegative(),
    stock: z.number().int().nonnegative(),
    minStock: z.number().int().nonnegative().default(5),
    gstRate: z.number().min(0).max(100),
    taxType: TaxTypeSchema.default('Inclusive'),
    unit: z.string().default('Pieces'),
    returns: ReturnStatusSchema.default('Returnable'),
    discountPercentage: z.number().min(0).max(100).default(0),
    image: z.string().url().optional().or(z.literal('')),
    expiryDate: z.string().optional(),
    hsnCode: z.string().optional(),
    description: z.string().optional(),
});

export const ProductUpdateSchema = ProductCreateSchema.partial();

export const BulkUpdateSchema = z.object({
    items: z.array(z.object({
        id: z.string(),
        stock: z.number().int().nonnegative().optional(),
        status: ProductStatusSchema.optional(),
    })).min(1),
});

export const BulkCreateSchema = z.object({
    items: z.array(ProductCreateSchema).min(1),
});

// ─── Customer ─────────────────────────────────────────────────────────────────
export const CustomerCreateSchema = z.object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().min(10),
    totalPaid: z.number().nonnegative().default(0),
    pending: z.number().nonnegative().default(0),
    status: PaymentStatusSchema.default('Paid'),
    address: z.string().optional(),
    channel: z.enum(['offline', 'online', 'both']).default('offline'),
});

export const CustomerUpdateSchema = CustomerCreateSchema.partial();

// ─── Vendor ───────────────────────────────────────────────────────────────────
export const VendorCreateSchema = z.object({
    name: z.string().min(1),
    businessName: z.string().min(1),
    gstNumber: z.string().optional(),
    phone: z.string().min(10),
    email: z.string().email().optional().or(z.literal('')),
    totalPaid: z.number().nonnegative().default(0),
    pendingAmount: z.number().nonnegative().default(0),
});

export const VendorUpdateSchema = VendorCreateSchema.partial();

// ─── Transaction (Sale) ───────────────────────────────────────────────────────
export const SaleItemSchema = z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().nonnegative(),
    quantity: z.number().int().positive(),
    gstRate: z.number().min(0).max(100),
    taxType: TaxTypeSchema,
    discountPercentage: z.number().min(0).max(100).default(0),
});

export const CreateTransactionSchema = z.object({
    customerId: z.string().optional(),
    items: z.array(SaleItemSchema).min(1),
    total: z.number().positive(),
    paidAmount: z.number().nonnegative(),
    gstAmount: z.number().nonnegative(),
    method: PaymentMethodSchema,
    source: z.enum(['online', 'offline']).default('offline'),
    date: z.string(),
    couponDiscount: z.number().nonnegative().optional(),
    // Optional walk-in customer fields
    custName: z.string().optional(),
    custPhone: z.string().optional(),
    custAddress: z.string().optional(),
});

export const UpdateTransactionSchema = z.object({
    orderStatus: OrderStatusSchema.optional(),
    assignedStaff: z.string().optional(),
    deliveryStatus: z.string().optional(),
    status: PaymentStatusSchema.optional(),
});

// ─── Purchase Order ───────────────────────────────────────────────────────────
export const CreatePurchaseSchema = z.object({
    vendorId: z.string().min(1),
    amount: z.number().positive(),
    date: z.string().min(1),
    status: PaymentStatusSchema.default('Paid'),
    paidAmount: z.number().nonnegative().optional(),
    referenceNo: z.string().optional(),
    notes: z.string().optional(),
});

// ─── Admin User ───────────────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    role: z.string().min(1),
    status: z.enum(['Active', 'Inactive']).default('Active'),
    permissions: z.record(z.string(), AccessLevelSchema),
});

export const UpdateUserSchema = z.object({
    name: z.string().optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).optional(),
    role: z.string().optional(),
    status: z.enum(['Active', 'Inactive']).optional(),
    permissions: z.record(z.string(), AccessLevelSchema).optional(),
});

// ─── Store Auth ───────────────────────────────────────────────────────────────
export const SendOtpSchema = z.object({
    phone: z.string().min(10),
});

export const VerifyOtpSchema = z.object({
    phone: z.string().min(10),
    otp: z.string().length(6),
});

export const StoreLoginSchema = z.object({
    phone: z.string().min(10),
    password: z.string().min(1),
});

export const StoreSignupSchema = z.object({
    phone: z.string().min(10),
    name: z.string().min(1),
    password: z.string().min(6),
});

export const SetPasswordSchema = z.object({
    password: z.string().min(6),
});

export const StoreRegisterSchema = z.object({
    phone: z.string().min(10),
    name: z.string().min(1),
    email: z.string().email().optional(),
});

export const StoreWishlistAddSchema = z.object({
    productId: z.string().min(1),
});

// ─── Store Profile & Address ──────────────────────────────────────────────────
export const UpdateProfileSchema = z.object({
    name: z.string().min(1).optional().or(z.literal('')),
    email: z.string().email().optional().or(z.literal('')),
});

export const AddressSchema = z.object({
    label: z.string().min(1),
    name: z.string().min(1),
    phone: z.string().min(10),
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    pincode: z.string().min(6),
    isDefault: z.boolean().default(false),
});

export const AddressUpdateSchema = AddressSchema.partial();

// ─── WhatsApp ─────────────────────────────────────────────────────────────────
export const SendWaMessageSchema = z.object({
    to: z.string().min(10),
    type: z.enum(['text', 'receipt', 'image']).default('text'),
    content: z.string(),
});

export const SendWaReceiptSchema = z.object({
    phone: z.string().min(10),
    storeName: z.string(),
    invoiceNo: z.string(),
    date: z.string(),
    items: z.array(z.object({
        name: z.string(),
        qty: z.number(),
        price: z.number(),
        amount: z.number(),
    })),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
    footer: z.string().optional(),
});

export const SendWaWhatsAppInvoiceSchema = z.object({
    billData: z.any(),
    shopSettings: z.any(),
    format: z.string().default('text'),
});

export const BulkMessageSchema = z.object({
    recipients: z.array(z.object({
        name: z.string(),
        phone: z.string(),
    })).min(1),
    message: z.string().min(1),
});

export const PairingCodeSchema = z.object({
    phone: z.string().min(10),
});
