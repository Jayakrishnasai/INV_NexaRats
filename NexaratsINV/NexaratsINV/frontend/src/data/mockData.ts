import { Product, Customer, Vendor, User } from '../types';

export const DEFAULT_USERS: User[] = [
    {
        id: '0',
        name: 'Nexus Admin',
        email: 'admin@nexarats.com',
        role: 'Super Admin',
        permissions: {
            'dashboard': 'manage', 'billing': 'manage', 'inventory': 'manage', 'customers': 'manage', 'vendors': 'manage',
            'analytics': 'manage', 'settings': 'manage', 'online-store': 'manage', 'admin': 'manage'
        }
    },
    {
        id: '1',
        name: 'Demo Admin',
        email: 'demo@nexarats.com',
        role: 'Super Admin',
        permissions: {
            'dashboard': 'manage', 'billing': 'manage', 'inventory': 'manage', 'customers': 'manage', 'vendors': 'manage',
            'analytics': 'manage', 'settings': 'manage', 'online-store': 'manage', 'admin': 'manage'
        }
    },
    {
        id: '2',
        name: 'Staff User',
        email: 'staff@nexarats.com',
        role: 'Manager',
        permissions: {
            'dashboard': 'read', 'billing': 'manage', 'inventory': 'manage', 'customers': 'manage', 'vendors': 'manage',
            'analytics': 'manage', 'settings': 'none', 'online-store': 'manage', 'admin': 'read'
        }
    }
];

export const DEFAULT_PRODUCTS: Product[] = [
    {
        id: '1',
        name: 'Organic Almond Milk',
        category: 'Dairy',
        price: 249,
        purchasePrice: 180,
        stock: 45,
        status: 'In Stock',
        sku: 'AMK-001',
        gstRate: 5,
        unit: 'Litre',
        mrp: 299,
        discountPercentage: 17,
        profit: 69,
        image: 'https://images.unsplash.com/photo-1550583724-125581cc25fb?auto=format&fit=crop&q=80&w=800',
        description: 'Pure organic almond milk, unsweetened and rich in Vitamin E. Perfect for health seekers.',
        minStock: 10,
        taxType: 'Inclusive'
    },
    {
        id: '2',
        name: 'Premium Arabica Coffee',
        category: 'Beverages',
        price: 899,
        purchasePrice: 650,
        stock: 22,
        status: 'In Stock',
        sku: 'COF-772',
        gstRate: 12,
        unit: 'Pack',
        mrp: 1200,
        discountPercentage: 25,
        profit: 249,
        image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=800',
        description: 'Single-origin Arabica beans, medium roast with notes of chocolate and caramel.',
        minStock: 5,
        taxType: 'Inclusive'
    },
    {
        id: '3',
        name: 'Smart Noise Cancelling Buds',
        category: 'Electronics',
        price: 4999,
        purchasePrice: 3800,
        stock: 8,
        status: 'Low Stock',
        sku: 'EBS-990',
        gstRate: 18,
        unit: 'Pieces',
        mrp: 6999,
        discountPercentage: 28,
        profit: 1199,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&q=80&w=800',
        description: 'Next-gen wireless earbuds with active noise cancellation and 30-hour battery life.',
        minStock: 10,
        taxType: 'Inclusive'
    }
];

export const DEFAULT_CUSTOMERS: Customer[] = [
    {
        id: 'WALK-IN',
        name: 'Walk-in Customer',
        email: 'walkin@example.com',
        phone: '1000000000',
        totalPaid: 0,
        pending: 0,
        status: 'Paid',
        lastTransaction: '',
        totalInvoices: 0
    },
    {
        id: 'CUST-1',
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        phone: '9876543210',
        totalPaid: 12450,
        pending: 0,
        status: 'Paid',
        lastTransaction: '2024-02-21',
        totalInvoices: 5
    }
];

export const DEFAULT_VENDORS: Vendor[] = [
    {
        id: 'VEND-1',
        name: 'Global Electronics Ltd',
        businessName: 'Global Electronics PVT LTD',
        gstNumber: '29AAAAA0000A1Z5',
        email: 'supply@globalelec.com',
        phone: '1800-ELE-999',
        totalPaid: 45000,
        pendingAmount: 12000,
        lastTransaction: '2024-02-15',
        totalInvoices: 12
    }
];

