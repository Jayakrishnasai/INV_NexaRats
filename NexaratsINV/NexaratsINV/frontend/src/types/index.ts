import { z } from 'zod';
import * as schemas from '../schemas';

/**
 * SHARED CONTRACT TYPES
 * These types reflect the expectations of the backend API and database schema.
 * Modifications here should be coordinated with the backend team.
 */

export type Page = 'login' | 'dashboard' | 'billing' | 'inventory' | 'customers' | 'vendors' | 'analytics' | 'settings' | 'admin' | 'online-store' | 'storefront' | 'invoice:create' | 'product:manage' | 'settings:manage' | 'user:manage' | 'payment:manage' | 'audit:read' | 'inventory:adjust' | 'admin-access' | 'all-invoices' | 'invoice:view';

export type ProductStatus = 'In Stock' | 'Low Stock' | 'Out of Stock';
export type TaxType = 'Inclusive' | 'Exclusive';
export type ReturnStatus = 'Returnable' | 'Not Returnable';

export interface Product {
    id: string;
    name: string;
    category: string;
    price: number;
    purchasePrice: number;
    stock: number;
    status: ProductStatus;
    image?: string;
    sku: string;
    gstRate: number;
    unit?: string;
    mrp: number;
    discountPercentage: number;
    expiryDate?: string;
    profit?: number;
    returns?: ReturnStatus;
    hsnCode?: string;
    taxType: TaxType;
    minStock?: number;
    description?: string;
}

export interface Customer {
    id: string;
    displayId?: string;
    name: string;
    email: string;
    phone: string;
    totalPaid: number;
    pending: number;
    status: 'Paid' | 'Unpaid' | 'Partial';
    lastTransaction?: string;
    totalInvoices?: number;
    address?: string;
    channel?: 'offline' | 'online' | 'both';
    addresses?: StoreAddress[];
    wishlist?: { productId: string; addedAt: string }[];
    totalOrders?: number;
    totalSpent?: number;
    lastLogin?: string;
    isActive?: boolean;
}

export interface Vendor {
    id: string;
    displayId?: string;
    name: string;
    businessName: string;
    gstNumber: string;
    phone: string;
    email: string;
    totalPaid: number;
    pendingAmount: number;
    lastTransaction?: string;
    totalInvoices?: number;
    image?: string;
}

export interface CartItem extends Product {
    quantity: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'split' | 'bank_transfer';
export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Unpaid' | 'Partial';

export interface Transaction {
    id: string;
    displayId?: string;
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
    customerAddress?: string;
    items: CartItem[];
    total: number;
    subtotal?: number;
    gstAmount: number;
    couponDiscount?: number;
    date: string;
    method: PaymentMethod;
    status: PaymentStatus;
    source: 'online' | 'offline';
    orderStatus?: OrderStatus;
    paidAmount?: number;
    deliveryAddress?: string;
    assignedStaff?: string;
    deliveryStatus?: string;
    timestamp?: number;
}

export interface PurchaseOrder {
    id: string;
    displayId?: string;
    vendorId: string;
    amount: number;
    date: string;
    status: PaymentStatus;
    /** Amount already paid (for Partial); when Paid equals amount, when Unpaid equals 0 */
    paidAmount?: number;
    referenceNo?: string;
    notes?: string;
    image?: string;
}

// Phase 2: RBAC Types
export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Cashier' | 'Staff' | 'Accountant' | 'Delivery Agent';
export type AccessLevel = 'manage' | 'cru' | 'read' | 'none';

export interface User {
    id: string;
    name: string;
    email: string;
    role: UserRole | string;
    permissions: Record<string, AccessLevel>;
}

export interface StoreAddress {
    id: string;
    label: string;
    name: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
}

export interface StoreCustomerProfile {
    id: string;
    name: string;
    email: string;
    addresses: StoreAddress[];
    wishlist: { productId: string; addedAt: string }[];
    totalOrders: number;
    totalSpent: number;
}

