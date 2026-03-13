// ─── Shared Type Definitions ───────────────────────────────────────────────────
// Must mirror the frontend types/index.ts exactly.

export type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
export type TaxType = 'Inclusive' | 'Exclusive';
export type ReturnStatus = 'Returnable' | 'Not Returnable';
export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split' | 'bank_transfer';
export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial';
export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Cashier' | 'Staff' | 'Accountant' | 'Delivery Agent';
export type AccessLevel = 'manage' | 'cru' | 'read' | 'none';

export interface Product {
    id: string;
    displayId?: string;
    name: string;
    sku: string;
    category: string;
    price: number;
    purchasePrice: number;
    mrp: number;
    stock: number;
    minStock: number;
    status: ProductStatus;
    gstRate: number;
    taxType: TaxType;
    unit: string;
    image?: string;
    expiryDate?: string;
    returns: ReturnStatus;
    discountPercentage: number;
    hsnCode?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Customer {
    id: string;
    displayId?: string;
    name: string;
    email?: string;
    phone: string;
    totalPaid: number;
    pending: number;
    status: PaymentStatus;
    lastTransaction?: string;
    totalInvoices: number;
    address?: string;
    channel: 'offline' | 'online' | 'both';
}

export interface Vendor {
    id: string;
    displayId?: string;
    name: string;
    businessName: string;
    gstNumber?: string;
    phone: string;
    email?: string;
    totalPaid: number;
    pendingAmount: number;
    lastTransaction?: string;
    totalInvoices: number;
    image?: string;
}

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    gstRate: number;
    taxType: TaxType;
    discountPercentage?: number;
}

export interface Transaction {
    id: string;
    displayId?: string;
    customerId?: string;
    items: CartItem[];
    subtotal: number;
    gstAmount: number;
    total: number;
    paidAmount: number;
    method: PaymentMethod;
    status: PaymentStatus;
    source: 'online' | 'offline';
    orderStatus?: OrderStatus;
    assignedStaff?: string;
    deliveryStatus?: string;
    date: string;
    createdAt: string;
}

export interface PurchaseOrder {
    id: string;
    displayId?: string;
    vendorId: string;
    amount: number;
    date: string;
    status: PaymentStatus;
    /** Amount already paid (for Partial status); when status is Paid equals amount, when Unpaid equals 0 */
    paidAmount?: number;
    referenceNo?: string;
    notes?: string;
}

export interface AdminUser {
    id: string;
    name: string;
    email: string;
    role: string;
    status: 'Active' | 'Inactive';
    permissions: Record<string, AccessLevel>;
    lastLogin?: string;
}

export interface StoreAddress {
    id: string;
    customerId: string;
    label: string;
    name: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
}

export interface StoreCustomer {
    id: string;
    name: string;
    phone: string;
    email?: string;
    totalOrders: number;
    totalSpent: number;
    createdAt: string;
}
