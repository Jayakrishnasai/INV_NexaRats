import axios, { AxiosInstance } from 'axios';
import { Product, Customer, Vendor, Transaction, PurchaseOrder, User, PaymentMethod, StoreAddress } from '../types';
import * as schemas from '../schemas';
import { DEFAULT_PRODUCTS, DEFAULT_CUSTOMERS, DEFAULT_VENDORS, DEFAULT_USERS } from '../data/mockData';
import { shortCustomerId, shortVendorId } from '../utils/shortId';
import { getLocalDateString } from '../utils/date';

/**
 * PRO-GRADE API SERVICE
 * 
 * DESIGNED FOR BACKEND DEVELOPERS:
 * 1. RESTful structure parity.
 * 2. Zod-backed validation for both entry and exit.
 * 3. Unified error handling.
 * 4. Easy toggle between 'Mock' and 'Production'.
 */

const STORAGE_PREFIX = 'inv_';
const STORE_PREFIX = 'nx_store_';

class ApiService {
    private client: AxiosInstance;
    private isMock: boolean = String(import.meta.env.VITE_USE_MOCKS).trim() === 'true';

    constructor() {
        // ── Safety Check: Warn if mock mode is on in non-localhost dev ───────
        if (this.isMock && window.location.hostname !== 'localhost') {
            console.warn('%c[API] WARNING: Running in MOCK mode on non-local host!', 'color: white; background: red; font-size: 20px; font-weight: bold; padding: 10px;');
        }
        this.client = axios.create({
            baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
            headers: { 'Content-Type': 'application/json' }
        });

        // ── Request: attach JWT Bearer token ───────────────────────────────────
        this.client.interceptors.request.use(config => {
            const token = sessionStorage.getItem('inv_token');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            return config;
        });

        // ── Response: unwrap { success, data } envelope (M1 fix) ───────────────
        // Backend wraps ALL responses in { success, data, message? }.
        // This interceptor strips the wrapper so all res.data reads below
        // get the raw payload — no changes needed anywhere else.
        this.client.interceptors.response.use(
            (response) => {
                const d = response.data;
                if (d && typeof d === 'object' && 'success' in d) {
                    if (!d.success) {
                        // M4: surface backend error message correctly
                        const err = new Error(d.error || 'Request failed');
                        (err as any).code = d.code;
                        (err as any).errors = d.errors;
                        return Promise.reject(err);
                    }
                    // Unwrap — res.data now equals the payload directly
                    response.data = d.data !== undefined ? d.data : d;
                }
                return response;
            },
            async (error) => {
                const original = error.config;
                // B2 FIX: silent 401 → try token refresh before redirecting to login
                if (error.response?.status === 401 && !original?._retry && !this.isMock) {
                    original._retry = true;
                    const rt = sessionStorage.getItem('inv_refresh_token');
                    const at = sessionStorage.getItem('inv_token');

                    // Only attempt refresh if we have a refresh token
                    if (rt && at) {
                        try {
                            const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
                            const res = await axios.post(
                                `${baseURL}/auth/refresh`,
                                { refreshToken: rt },
                                { headers: { 'Content-Type': 'application/json' } }
                            );
                            const payload = res.data?.data || res.data;
                            const newToken = payload?.token || payload;
                            if (newToken && typeof newToken === 'string') {
                                sessionStorage.setItem('inv_token', newToken);
                                original.headers = original.headers || {};
                                original.headers.Authorization = `Bearer ${newToken}`;
                                return this.client(original);
                            }
                        } catch {
                            // Refresh failed — session truly expired, clear and redirect
                            sessionStorage.removeItem('inv_token');
                            sessionStorage.removeItem('inv_refresh_token');
                            window.location.href = '/login';
                            return Promise.reject(error);
                        }
                    }
                    // No tokens at all — quietly reject without redirect (handles unauthenticated endpoints)
                    if (!at) {
                        return Promise.reject(error);
                    }
                    // Had access token but refresh unavailable — clear and redirect
                    sessionStorage.removeItem('inv_token');
                    sessionStorage.removeItem('inv_refresh_token');
                    window.location.href = '/login';
                    return Promise.reject(error);
                }
                // M4: extract structured error from envelope
                const msg = error.response?.data?.error || error.message || 'An error occurred';
                const code = error.response?.data?.code || 'UNKNOWN';
                const richErr = new Error(msg);
                (richErr as any).code = code;
                (richErr as any).status = error.response?.status;
                (richErr as any).errors = error.response?.data?.errors;
                return Promise.reject(richErr);
            }
        );
    }

    private async delay(ms = 300) { if (this.isMock) return new Promise(r => setTimeout(r, ms)); }

    private mockGet<T>(key: string): T[] {
        try {
            const data = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
            return data ? JSON.parse(data) : [];
        } catch { return []; }
    }

    private mockSave<T>(key: string, data: T[]) {
        try {
            localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(data));
        } catch (err) {
            console.error(`[STORAGE] Failed to save "${key}" — storage may be full:`, err);
        }
    }

    // --- PRODUCTS ---
    public products = {
        getAll: async (): Promise<Product[]> => {
            if (this.isMock) {
                await this.delay();
                let data = this.mockGet<Product>('products');
                if (data.length === 0) {
                    data = DEFAULT_PRODUCTS;
                    this.mockSave('products', data);
                }
                return data;
            }
            // Online Storefront: Try public store endpoint first if no admin token
            // Backend protected /products for admins (Fix C1), so a separate public
            // endpoint /store/products was added for the storefront.
            const hasAdminToken = !!sessionStorage.getItem('inv_token');
            try {
                const endpoint = hasAdminToken ? '/products' : '/store/products';
                const res = await this.client.get<Product[]>(endpoint);
                return res.data;
            } catch (err: any) {
                // If the store endpoint doesn't exist yet or fails, fallback to admin (might 401)
                if (!hasAdminToken) {
                    const res = await this.client.get<Product[]>('/products');
                    return res.data;
                }
                throw err;
            }
        },
        create: async (data: any): Promise<Product> => {
            const validated = schemas.ProductSchema.parse({ ...data, id: data.id || crypto.randomUUID() }) as Product;
            if (this.isMock) {
                const list = this.mockGet<Product>('products');
                this.mockSave('products', [validated, ...list]);
                return validated;
            }
            const res = await this.client.post<Product>('/products', validated);
            return res.data;
        },
        update: async (id: string, data: any): Promise<Product> => {
            if (this.isMock) {
                const list = this.mockGet<Product>('products');
                const index = list.findIndex(p => p.id === id);
                if (index === -1) throw new Error('Product not found');
                const updated = { ...list[index], ...data } as Product;
                list[index] = updated;
                this.mockSave('products', list);
                return updated;
            }
            const res = await this.client.put<Product>(`/products/${id}`, data);
            return res.data;
        },
        delete: async (id: string): Promise<void> => {
            if (this.isMock) {
                const list = this.mockGet<Product>('products');
                this.mockSave('products', list.filter(p => p.id !== id));
                return;
            }
            await this.client.delete(`/products/${id}`);
        },
        bulkUpdate: async (items: Partial<Product>[]): Promise<Product[]> => {
            if (this.isMock) {
                const list = this.mockGet<Product>('products');
                const updated = list.map(p => {
                    const match = items.find(u => u.id === p.id);
                    return match ? { ...p, ...match } : p;
                }) as Product[];
                this.mockSave('products', updated);
                return updated;
            }
            const res = await this.client.patch<Product[]>('/products/bulk', { items });
            return res.data;
        },
        bulkCreate: async (items: Product[]): Promise<{ results: Product[], failures?: any[] }> => {
            if (this.isMock) {
                const list = this.mockGet<Product>('products');
                const newItems = items.map(data => schemas.ProductSchema.parse({ ...data, id: data.id || crypto.randomUUID() }) as Product);
                this.mockSave('products', [...newItems, ...list]);
                return { results: newItems };
            }
            const res = await this.client.post<{ results: Product[], failures?: any[] }>('/products/bulk', { items });
            return res.data;
        },
        seed: async (items: Product[]) => {
            this.mockSave('products', items);
            return { success: true };
        }
    };

    // --- CUSTOMERS ---
    public customers = {
        getAll: async (): Promise<Customer[]> => {
            if (this.isMock) {
                await this.delay();
                let data = this.mockGet<Customer>('customers');
                if (data.length === 0) {
                    data = DEFAULT_CUSTOMERS;
                    this.mockSave('customers', data);
                }
                return data;
            }
            const res = await this.client.get<Customer[]>('/customers');
            return res.data;
        },
        getOne: async (id: string): Promise<Customer | null> => {
            if (this.isMock) {
                const list = this.mockGet<Customer>('customers');
                return list.find(c => c.id === id) || null;
            }
            const res = await this.client.get<Customer>(`/customers/${id}`);
            return res.data;
        },
        create: async (data: Partial<Customer>): Promise<Customer> => {
            if (this.isMock) {
                const list = this.mockGet<Customer>('customers');
                const id = (data as Customer).id || shortCustomerId();
                const displayId = (data as Customer).displayId || id;
                const created: Customer = {
                    ...data,
                    id,
                    displayId,
                    name: data.name!,
                    phone: data.phone!,
                    email: data.email ?? '',
                    totalPaid: data.totalPaid ?? 0,
                    pending: data.pending ?? 0,
                    status: (data.status as Customer['status']) ?? 'Paid',
                    totalInvoices: data.totalInvoices ?? 0,
                    address: data.address,
                    channel: (data.channel as Customer['channel']) ?? 'offline',
                } as Customer;
                this.mockSave('customers', [created, ...list]);
                return created;
            }
            const res = await this.client.post<Customer>('/customers', data);
            return res.data;
        },
        update: async (id: string, data: Partial<Customer>): Promise<Customer> => {
            if (this.isMock) {
                const list = this.mockGet<Customer>('customers');
                const updated = list.map(c => c.id === id ? { ...c, ...data } : c);
                this.mockSave('customers', updated);
                return updated.find(c => c.id === id)!;
            }
            const res = await this.client.put<Customer>(`/customers/${id}`, data);
            return res.data;
        },
        delete: async (id: string): Promise<void> => {
            if (this.isMock) {
                const list = this.mockGet<Customer>('customers');
                this.mockSave('customers', list.filter(c => c.id !== id));
                return;
            }
            await this.client.delete(`/customers/${id}`);
        },
        seed: async (items: Customer[]) => {
            this.mockSave('customers', items);
            return { success: true };
        }
    };

    // --- VENDORS ---
    public vendors = {
        getAll: async (): Promise<Vendor[]> => {
            if (this.isMock) {
                await this.delay();
                let data = this.mockGet<Vendor>('vendors');
                if (data.length === 0) {
                    data = DEFAULT_VENDORS;
                    this.mockSave('vendors', data);
                }
                return data;
            }
            const res = await this.client.get<Vendor[]>('/vendors');
            return res.data;
        },
        create: async (data: Partial<Vendor>): Promise<Vendor> => {
            if (this.isMock) {
                const list = this.mockGet<Vendor>('vendors');
                const id = (data as Vendor).id || shortVendorId();
                const displayId = (data as Vendor).displayId || id;
                const created: Vendor = {
                    ...data,
                    id,
                    displayId,
                    name: data.name!,
                    businessName: data.businessName!,
                    phone: data.phone!,
                    email: data.email,
                    gstNumber: data.gstNumber,
                    totalPaid: data.totalPaid ?? 0,
                    pendingAmount: data.pendingAmount ?? 0,
                    lastTransaction: data.lastTransaction,
                    totalInvoices: data.totalInvoices ?? 0,
                    image: data.image,
                } as Vendor;
                this.mockSave('vendors', [created, ...list]);
                return created;
            }
            const res = await this.client.post<Vendor>('/vendors', data);
            return res.data;
        },
        update: async (id: string, data: Partial<Vendor>): Promise<Vendor> => {
            if (this.isMock) {
                const list = this.mockGet<Vendor>('vendors');
                const updated = list.map(v => v.id === id ? { ...v, ...data } : v);
                this.mockSave('vendors', updated);
                return updated.find(v => v.id === id)!;
            }
            const res = await this.client.put<Vendor>(`/vendors/${id}`, data);
            return res.data;
        },
        // M5: vendor delete was missing for real backend
        delete: async (id: string): Promise<void> => {
            if (this.isMock) {
                const list = this.mockGet<Vendor>('vendors');
                this.mockSave('vendors', list.filter(v => v.id !== id));
                return;
            }
            await this.client.delete(`/vendors/${id}`);
        },
        seed: async (items: Vendor[]) => {
            this.mockSave('vendors', items);
            return { success: true };
        }
    };

    // --- TRANSACTIONS ---
    public transactions = {
        getAll: async (): Promise<Transaction[]> => {
            if (this.isMock) {
                await this.delay();
                return this.mockGet<Transaction>('transactions');
            }
            const res = await this.client.get<Transaction[]>('/transactions');
            return res.data;
        },
        create: async (data: Transaction): Promise<Transaction> => {
            if (this.isMock) {
                const list = this.mockGet<Transaction>('transactions');
                this.mockSave('transactions', [data, ...list]);
                return data;
            }
            const res = await this.client.post<Transaction>('/transactions', data);
            return res.data;
        },
        update: async (id: string, data: Partial<Transaction>): Promise<Transaction> => {
            if (this.isMock) {
                const list = this.mockGet<Transaction>('transactions');
                const updated = list.map(t => t.id === id ? { ...t, ...data } : t);
                this.mockSave('transactions', updated);
                return updated.find(t => t.id === id)!;
            }
            const res = await this.client.put<Transaction>(`/transactions/${id}`, data);
            return res.data;
        },
        getBySource: async (source: string): Promise<Transaction[]> => {
            if (this.isMock) {
                return this.mockGet<Transaction>('transactions').filter(t => t.source === source);
            }
            const res = await this.client.get<Transaction[]>(`/transactions?source=${source}`);
            return res.data;
        },
        delete: async (id: string): Promise<void> => {
            if (this.isMock) {
                const list = this.mockGet<Transaction>('transactions');
                this.mockSave('transactions', list.filter(t => t.id !== id));
                return;
            }
            await this.client.delete(`/transactions/${id}`);
        }
    };

    // --- PURCHASES ---
    public purchases = {
        getAll: async (): Promise<PurchaseOrder[]> => {
            if (this.isMock) return this.mockGet<PurchaseOrder>('purchases');
            const res = await this.client.get<PurchaseOrder[]>('/purchases');
            return res.data;
        },
        create: async (data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
            if (this.isMock) {
                const list = this.mockGet<PurchaseOrder>('purchases');
                const created: PurchaseOrder = {
                    id: `po-${Date.now()}`,
                    vendorId: data.vendorId!,
                    amount: data.amount!,
                    date: data.date!,
                    status: (data.status as PurchaseOrder['status']) ?? 'Paid',
                    paidAmount: data.paidAmount,
                    referenceNo: data.referenceNo,
                    notes: data.notes,
                    image: data.image,
                };
                this.mockSave('purchases', [created, ...list]);
                return created;
            }
            const res = await this.client.post<PurchaseOrder>('/purchases', data);
            return res.data;
        },
        delete: async (id: string): Promise<void> => {
            if (this.isMock) {
                const list = this.mockGet<PurchaseOrder>('purchases');
                this.mockSave('purchases', list.filter(p => p.id !== id));
                return;
            }
            await this.client.delete(`/purchases/${id}`);
        }
    };

    // --- WHATSAPP ---
    // Dedicated axios instance for the WhatsApp microservice (port 5005).
    // This bypasses the main client's response-envelope unwrapping so the
    // WhatsAppSettings component receives the raw { success, data } shape.
    private getWhatsAppBaseURL(): string {
        const envUrl = import.meta.env.VITE_WHATSAPP_API_URL;
        if (envUrl) return envUrl;

        // Fallback: try to infer from the main API URL or current host
        const mainApiUrl = import.meta.env.VITE_API_BASE_URL || '';
        if (mainApiUrl.includes('http')) {
            try {
                const url = new URL(mainApiUrl);
                return `${url.protocol}//${url.hostname}:5005/api/whatsapp`;
            } catch { /* ignore */ }
        }

        // Final fallback to localhost
        return 'http://localhost:5005/api/whatsapp';
    }

    private waClient = axios.create({
        baseURL: this.getWhatsAppBaseURL(),
        headers: { 
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_WA_API_KEY || '' // FIX C2: Send key to WhatsApp service
        },
    });

    public whatsapp = {
        getStatus: async (): Promise<any> => {
            if (this.isMock) {
                await this.delay();
                const config = localStorage.getItem(`${STORAGE_PREFIX}whatsapp_config`);
                const parsed = config ? JSON.parse(config) : {};
                const isReady = parsed.status === 'ready';
                return {
                    success: true,
                    data: {
                        status: isReady ? 'ready' : 'disconnected',
                        connectionInfo: { platform: 'mock', pushName: 'NexaPOS' },
                    }
                };
            }
            const res = await this.waClient.get('/status');
            return res.data;
        },
        getQr: async (): Promise<any> => {
            if (this.isMock) {
                await this.delay(500);
                return { success: true, qr: 'data:image/png;base64,MOCK_QR_CODE_PLACEHOLDER' };
            }
            const res = await this.waClient.get('/qr');
            return res.data;
        },
        logout: async (): Promise<{ success: boolean }> => {
            if (this.isMock) {
                localStorage.removeItem(`${STORAGE_PREFIX}whatsapp_config`);
                return { success: true };
            }
            const res = await this.waClient.post('/logout');
            return res.data;
        },
        restart: async (): Promise<{ success: boolean }> => {
            if (this.isMock) {
                await this.delay(1000);
                return { success: true };
            }
            const res = await this.waClient.post('/restart');
            return res.data;
        },
        requestPairingCode: async (phone: string): Promise<any> => {
            if (this.isMock) {
                await this.delay(1000);
                return { success: true, pairingCode: '1234-5678', message: 'Pairing code generated' };
            }
            const res = await this.waClient.post('/pair', { phoneNumber: phone });
            return res.data;
        },
        sendReceipt: async (phone: string, data: any): Promise<{ success: boolean }> => {
            if (this.isMock) {
                await this.delay(800);
                return { success: true };
            }
            const res = await this.waClient.post('/send-receipt', { to: phone, receipt: data });
            return res.data;
        },
        send: async (data: any): Promise<{ success: boolean }> => {
            if (this.isMock) {
                await this.delay(500);
                return { success: true };
            }
            const res = await this.waClient.post('/send', data);
            return res.data;
        },
        getMessages: async (params?: any): Promise<any> => {
            if (this.isMock) {
                return { success: true, data: [] };
            }
            const res = await this.waClient.get('/messages', { params });
            return res.data;
        }
    };

    // --- INVOICES & MESSAGING ---
    public invoices = {
        getAll: async (params?: { source?: string; status?: string; from?: string; to?: string }): Promise<any[]> => {
            if (this.isMock) {
                return this.mockGet<any>('transactions');
            }
            const res = await this.client.get<any[]>('/invoices', { params });
            return res.data;
        },
        getById: async (id: string): Promise<any> => {
            if (this.isMock) {
                const list = this.mockGet<any>('transactions');
                return list.find((t: any) => t.id === id) || null;
            }
            const res = await this.client.get<any>(`/invoices/${id}`);
            return res.data;
        },
        sendWhatsApp: async (billData: any, shopSettings: any, format: string): Promise<{ success: boolean }> => {
            if (this.isMock) {
                await this.delay(1000);
                return { success: true };
            }
            const res = await this.client.post('/invoices/send-whatsapp', { billData, shopSettings, format });
            return res.data;
        },
        downloadPdf: async (billData: any, shopSettings: any): Promise<void> => {
            if (this.isMock) {
                await this.delay(500);
                alert('Mock PDF downloaded');
                return;
            }
            const res = await this.client.post('/invoices/download-pdf', { billData, shopSettings }, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${billData.id || 'invoice'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        },
        sendBulkMessage: async (recipients: { name: string; phone: string }[], message: string): Promise<{ sent: number; failed: number; skipped: number }> => {
            if (this.isMock) {
                await this.delay(1500);
                return { sent: recipients.length, failed: 0, skipped: 0 };
            }
            const res = await this.client.post('/invoices/bulk-message', { recipients, message });
            return res.data;
        }
    };

    // --- DASHBOARD (Daily Overview) ---
    public dashboard = {
        getDailyData: async (date?: string): Promise<any> => {
            if (this.isMock) {
                await this.delay(500);
                const transactions = this.mockGet<Transaction>('transactions');
                const filterDate = date || getLocalDateString();
                return {
                    transactions: transactions.filter((t: any) => t.date === filterDate),
                    purchases: this.mockGet<PurchaseOrder>('purchases').filter((p: any) => p.date === filterDate),
                    products: this.mockGet<Product>('products'),
                    customers: this.mockGet<Customer>('customers'),
                    vendors: this.mockGet<Vendor>('vendors')
                };
            }
            const res = await this.client.get('/dashboard', { params: { date } });
            return res.data;
        },
        reset: async (): Promise<any> => {
            if (this.isMock) {
                this.mockSave('transactions', []);
                this.mockSave('purchases', []);
                this.mockSave('customers', []);
                this.mockSave('vendors', []);
                return { success: true };
            }
            const res = await this.client.post('/dashboard/reset');
            return res.data;
        }
    };

    // --- ANALYTICS ---
    public analytics = {
        getReports: async (): Promise<any[]> => {
            if (this.isMock) {
                await this.delay(300);
                return [];
            }
            const res = await this.client.get('/analytics');
            return res.data?.reports || [];
        },
        downloadReport: (filename: string): void => {
            if (this.isMock) {
                alert(`Mock download for: ${filename}`);
                return;
            }
            const url = `${this.client.defaults.baseURL}/analytics/download/${filename}`;
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
        },
        triggerExport: async (): Promise<any> => {
            if (this.isMock) {
                await this.delay(800);
                return { success: true, message: 'Mock export triggered' };
            }
            const res = await this.client.post('/analytics/trigger');
            return res.data;
        }
    };

    // --- PAYMENT (Razorpay) ---
    public payment = {
        /** Check if Razorpay is configured on the backend. */
        getRazorpayConfig: async (): Promise<{ enabled: boolean; keyId: string | null }> => {
            if (this.isMock) {
                return { enabled: false, keyId: null };
            }
            const res = await this.client.get<{ enabled: boolean; keyId: string | null }>('/payment/config');
            return res.data;
        },
        /** Create a Razorpay order for the given amount (in rupees). */
        createOrder: async (amount: number, receipt?: string): Promise<any> => {
            if (this.isMock) {
                return { id: `mock_order_${Date.now()}`, amount: amount * 100, currency: 'INR' };
            }
            const res = await this.client.post<any>('/payment/create-order', { amount, receipt });
            return res.data;
        },
        /** Verify Razorpay signature and atomically process the sale. */
        verify: async (
            razorpayOrderId: string,
            razorpayPaymentId: string,
            razorpaySignature: string,
            saleData: any
        ): Promise<any> => {
            if (this.isMock) {
                return { success: true, transactionId: `mock_txn_${Date.now()}` };
            }
            const res = await this.client.post<any>('/payment/verify', {
                razorpay_order_id: razorpayOrderId,
                razorpay_payment_id: razorpayPaymentId,
                razorpay_signature: razorpaySignature,
                saleData,
            });
            return res.data;
        },
    };

    // --- AUTH / USERS ---
    public users = {
        getAll: async (): Promise<User[]> => {
            if (this.isMock) {
                let data = this.mockGet<User>('users');
                if (data.length === 0) {
                    data = DEFAULT_USERS;
                    this.mockSave('users', data);
                }
                return data;
            }
            const res = await this.client.get<User[]>('/users');
            return res.data;
        },
        create: async (data: any): Promise<User> => {
            if (this.isMock) {
                const list = this.mockGet<any>('users');
                this.mockSave('users', [...list, data]);
                return data;
            }
            const res = await this.client.post<User>('/users', data);
            return res.data;
        },
        update: async (id: string, data: Partial<User & { password?: string; status?: string }>): Promise<User> => {
            if (this.isMock) {
                const list = this.mockGet<any>('users');
                const updated = list.map((u: any) => u.id === id ? { ...u, ...data } : u);
                this.mockSave('users', updated);
                return updated.find((u: any) => u.id === id)!;
            }
            const res = await this.client.put<User>(`/users/${id}`, data);
            return res.data;
        },
        delete: async (id: string): Promise<void> => {
            if (this.isMock) {
                const list = this.mockGet<any>('users');
                this.mockSave('users', list.filter((u: any) => u.id !== id));
                return;
            }
            await this.client.delete(`/users/${id}`);
        },
        login: async (email: string, password: string): Promise<{ success: boolean; user: User; token: string; refreshToken?: string }> => {
            if (this.isMock) {
                await this.delay(800);
                const users = this.mockGet<any>('users');
                // MOCK ONLY — never use plain text in production
                const user = users.find((u: any) => u.email === email && u.password === password);
                if (user) {
                    const { password: _, ...safeUser } = user;
                    return { success: true, user: safeUser, token: `mock_${Date.now()}_${Math.random().toString(36).substr(2)}` };
                }
                throw new Error('Invalid credentials');
            }
            const res = await this.client.post('/auth/login', { email, password });
            // M6: persist refresh token for silent re-auth
            if (res.data?.refreshToken) {
                sessionStorage.setItem('inv_refresh_token', res.data.refreshToken);
            }
            return res.data;
        },
        seed: async (items: User[]) => {
            this.mockSave('users', items);
            return { success: true };
        }
    };

    // --- STOREFRONT AUTH (Online Store Customer Auth) ---
    public auth = {
        sendOtp: async (phone: string): Promise<{ success: boolean; otp?: string; message?: string }> => {
            if (this.isMock) {
                await this.delay(500);
                return { success: true, otp: '123456', message: 'OTP sent to your WhatsApp!' };
            }
            const res = await this.client.post('/store/auth/send-otp', { phone });
            return { success: true, ...res.data };
        },
        verifyOtp: async (phone: string, otp: string): Promise<{ success: boolean; token: string; phone: string; sessionToken: string; customer?: any }> => {
            if (this.isMock) {
                await this.delay(500);
                const customers = this.mockGet<any>('store_customers');
                const existing = customers.find((c: any) => c.phone === phone);
                const token = `store_${Date.now()}_${Math.random().toString(36).substr(2)}`;
                // Save session
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                sessions[token] = { phone, loggedIn: true, createdAt: Date.now() };
                localStorage.setItem(`${STORE_PREFIX}sessions`, JSON.stringify(sessions));
                return { success: true, token, sessionToken: token, phone, customer: existing || null };
            }
            const res = await this.client.post('/store/auth/verify-otp', { phone, otp });
            // verifyOtp backend explicitly returns token and mapped fields, but making sure:
            return { success: true, phone, sessionToken: res.data?.token || res.data?.sessionToken, ...res.data };
        },
        loginWithPassword: async (phone: string, password: string): Promise<{ success: boolean; phone: string; sessionToken: string; customer?: any }> => {
            if (this.isMock) {
                await this.delay(500);
                const customers = this.mockGet<any>('store_customers');
                const customer = customers.find((c: any) => c.phone === phone && c.password === password);
                if (!customer) throw new Error('Invalid phone or password');
                const token = `store_${Date.now()}_${Math.random().toString(36).substr(2)}`;
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                sessions[token] = { phone, loggedIn: true, createdAt: Date.now() };
                localStorage.setItem(`${STORE_PREFIX}sessions`, JSON.stringify(sessions));
                return { success: true, phone, sessionToken: token, customer };
            }
            const res = await this.client.post('/store/auth/login', { phone, password });
            return { success: true, phone, sessionToken: res.data?.token, ...res.data };
        },
        signup: async (phone: string, name: string, password: string): Promise<{ success: boolean; phone: string; sessionToken: string; customer: any }> => {
            if (this.isMock) {
                await this.delay(500);
                const newCustomer = {
                    id: `SCUST-${Date.now()}`, name, phone, password,
                    email: '', addresses: [], wishlist: [], totalOrders: 0, totalSpent: 0,
                    createdAt: new Date().toISOString()
                };
                const customers = this.mockGet<any>('store_customers');
                this.mockSave('store_customers' as any, [...customers, newCustomer] as any);
                const token = `store_${Date.now()}_${Math.random().toString(36).substr(2)}`;
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                sessions[token] = { phone, loggedIn: true, createdAt: Date.now() };
                localStorage.setItem(`${STORE_PREFIX}sessions`, JSON.stringify(sessions));
                return { success: true, phone, sessionToken: token, customer: newCustomer };
            }
            const res = await this.client.post('/store/auth/signup', { phone, name, password });
            return { success: true, phone, sessionToken: res.data?.token, ...res.data };
        },
        setPassword: async (token: string, password: string): Promise<{ success: boolean }> => {
            if (this.isMock) {
                await this.delay(300);
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) throw new Error('Not authenticated');
                const customers = this.mockGet<any>('store_customers');
                const idx = customers.findIndex((c: any) => c.phone === session.phone);
                if (idx >= 0) {
                    customers[idx].password = password;
                    this.mockSave('store_customers' as any, customers as any);
                }
                return { success: true };
            }
            const res = await this.client.post('/store/auth/set-password', { password }, { headers: { 'X-Store-Token': token } });
            return res.data;
        },
        getStoreCustomers: async (): Promise<{ customers: any[] }> => {
            if (this.isMock) {
                await this.delay(300);
                const customers = this.mockGet<any>('store_customers');
                return { customers };
            }
            // M9: wrap array returned by backend into expected { customers } shape
            const res = await this.client.get('/store/customers');
            return { customers: Array.isArray(res.data) ? res.data : [] };
        },
        register: async (phone: string, name: string, email: string): Promise<{ success: boolean; token: string; customer: any }> => {
            if (this.isMock) {
                await this.delay(500);
                const newCustomer = {
                    id: `SCUST-${Date.now()}`, name, email, phone,
                    addresses: [], wishlist: [], totalOrders: 0, totalSpent: 0
                };
                const customers = this.mockGet<any>('store_customers');
                this.mockSave('store_customers' as any, [...customers, newCustomer] as any);
                const token = `store_${Date.now()}_${Math.random().toString(36).substr(2)}`;
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                sessions[token] = { phone, loggedIn: true, createdAt: Date.now() };
                localStorage.setItem(`${STORE_PREFIX}sessions`, JSON.stringify(sessions));
                return { success: true, token, customer: newCustomer };
            }
            const res = await this.client.post('/store/auth/register', { phone, name, email });
            return res.data;
        },
        checkSession: async (token: string): Promise<{ loggedIn: boolean; phone: string; customer?: any }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session?.loggedIn) return { loggedIn: false, phone: '' };
                const customers = this.mockGet<any>('store_customers');
                const customer = customers.find((c: any) => c.phone === session.phone);
                return { loggedIn: true, phone: session.phone, customer: customer || null };
            }
            const res = await this.client.get('/store/auth/session', { headers: { 'X-Store-Token': token } });
            return res.data;
        },
        logout: async (token: string): Promise<{ success: boolean }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                delete sessions[token];
                localStorage.setItem(`${STORE_PREFIX}sessions`, JSON.stringify(sessions));
                return { success: true };
            }
            const res = await this.client.post('/store/auth/logout', {}, { headers: { 'X-Store-Token': token } });
            return res.data;
        },
        getOrders: async (token: string): Promise<{ orders: any[] }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) return { orders: [] };
                const txns = this.mockGet<Transaction>('transactions');
                const customers = this.mockGet<any>('store_customers');
                const customer = customers.find((c: any) => c.phone === session.phone);
                const orders = customer ? txns.filter(t => t.customerId === customer.id) : [];
                return { orders };
            }
            // M7: backend returns array directly (after envelope unwrap); wrap for frontend
            const res = await this.client.get('/store/orders', { headers: { 'X-Store-Token': token } });
            return { orders: Array.isArray(res.data) ? res.data : [] };
        },
        createOrder: async (token: string, data: Transaction): Promise<{ success: boolean }> => {
            if (this.isMock) {
                const txns = this.mockGet<Transaction>('transactions');
                this.mockSave('transactions', [data, ...txns]);

                // Sync address back to the customer table
                const customers = this.mockGet<Customer>('customers');
                const idx = customers.findIndex(c => c.id === data.customerId);
                if (idx !== -1 && data.deliveryAddress) {
                    customers[idx].address = data.deliveryAddress;
                    this.mockSave('customers', customers);
                }

                return { success: true };
            }
            const res = await this.client.post('/store/orders', data, { headers: { 'X-Store-Token': token } });
            return res.data;
        },
        getWishlist: async (token: string): Promise<{ wishlist: { productId: string; addedAt: string }[] }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) return { wishlist: [] };
                const customers = this.mockGet<any>('store_customers');
                const customer = customers.find((c: any) => c.phone === session.phone);
                return { wishlist: customer?.wishlist || [] };
            }
            // M8: wrap array returned by backend into expected { wishlist } shape
            const res = await this.client.get('/store/wishlist', { headers: { 'X-Store-Token': token } });
            return { wishlist: Array.isArray(res.data) ? res.data : [] };
        },
        addToWishlist: async (token: string, productId: string): Promise<{ success: boolean }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) return { success: false };
                const customers = this.mockGet<any>('store_customers');
                const idx = customers.findIndex((c: any) => c.phone === session.phone);
                if (idx >= 0) {
                    customers[idx].wishlist = [...(customers[idx].wishlist || []), { productId, addedAt: new Date().toISOString() }];
                    this.mockSave('store_customers' as any, customers as any);
                }
                return { success: true };
            }
            const res = await this.client.post('/store/wishlist', { productId }, { headers: { 'X-Store-Token': token } });
            return res.data;
        },
        removeFromWishlist: async (token: string, productId: string): Promise<{ success: boolean }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) return { success: false };
                const customers = this.mockGet<any>('store_customers');
                const idx = customers.findIndex((c: any) => c.phone === session.phone);
                if (idx >= 0) {
                    customers[idx].wishlist = (customers[idx].wishlist || []).filter((w: any) => w.productId !== productId);
                    this.mockSave('store_customers' as any, customers as any);
                }
                return { success: true };
            }
            const res = await this.client.delete(`/store/wishlist/${productId}`, { headers: { 'X-Store-Token': token } });
            return res.data;
        },
        updateProfile: async (token: string, data: { name: string; email: string }): Promise<{ customer: any }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) throw new Error('Not authenticated');
                const customers = this.mockGet<any>('store_customers');
                const idx = customers.findIndex((c: any) => c.phone === session.phone);
                if (idx >= 0) {
                    customers[idx] = { ...customers[idx], ...data };
                    this.mockSave('store_customers' as any, customers as any);
                    return { customer: customers[idx] };
                }
                throw new Error('Customer not found');
            }
            const res = await this.client.put('/store/profile', data, { headers: { 'X-Store-Token': token } });
            return res.data;
        },
        addAddress: async (token: string, address: Omit<StoreAddress, 'id'>): Promise<{ addresses: StoreAddress[] }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) throw new Error('Not authenticated');
                const customers = this.mockGet<any>('store_customers');
                const idx = customers.findIndex((c: any) => c.phone === session.phone);
                if (idx >= 0) {
                    const newAddr = { ...address, id: `ADDR-${Date.now()}` };
                    customers[idx].addresses = [...(customers[idx].addresses || []), newAddr];
                    this.mockSave('store_customers' as any, customers as any);
                    return { addresses: customers[idx].addresses };
                }
                throw new Error('Customer not found');
            }
            // M10: backend returns single address object; wrap in array for frontend
            const res = await this.client.post('/store/addresses', address, { headers: { 'X-Store-Token': token } });
            const newAddr = res.data;
            return { addresses: newAddr ? [newAddr] : [] };
        },
        updateAddress: async (token: string, addrId: string, address: Partial<StoreAddress>): Promise<{ addresses: StoreAddress[] }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) throw new Error('Not authenticated');
                const customers = this.mockGet<any>('store_customers');
                const idx = customers.findIndex((c: any) => c.phone === session.phone);
                if (idx >= 0) {
                    customers[idx].addresses = (customers[idx].addresses || []).map((a: any) =>
                        a.id === addrId ? { ...a, ...address } : a
                    );
                    this.mockSave('store_customers' as any, customers as any);
                    return { addresses: customers[idx].addresses };
                }
                throw new Error('Customer not found');
            }
            // M10: backend returns updated address object; wrap in array for frontend
            const res = await this.client.put(`/store/addresses/${addrId}`, address, { headers: { 'X-Store-Token': token } });
            const updated = res.data;
            return { addresses: updated ? [updated] : [] };
        },
        deleteAddress: async (token: string, addrId: string): Promise<{ addresses: StoreAddress[] }> => {
            if (this.isMock) {
                const sessions = JSON.parse(localStorage.getItem(`${STORE_PREFIX}sessions`) || '{}');
                const session = sessions[token];
                if (!session) throw new Error('Not authenticated');
                const customers = this.mockGet<any>('store_customers');
                const idx = customers.findIndex((c: any) => c.phone === session.phone);
                if (idx >= 0) {
                    customers[idx].addresses = (customers[idx].addresses || []).filter((a: any) => a.id !== addrId);
                    this.mockSave('store_customers' as any, customers as any);
                    return { addresses: customers[idx].addresses };
                }
                throw new Error('Customer not found');
            }
            const res = await this.client.delete(`/store/addresses/${addrId}`, { headers: { 'X-Store-Token': token } });
            return res.data;
        },
        payment: {
            getConfig: async (token: string): Promise<{ enabled: boolean; keyId: string | null }> => {
                if (this.isMock) return { enabled: false, keyId: null };
                const res = await this.client.get('/store/payment/config', { headers: { 'X-Store-Token': token } });
                return res.data;
            },
            createOrder: async (token: string, amount: number, receipt?: string): Promise<any> => {
                if (this.isMock) return { id: `mock_order_${Date.now()}`, amount: amount * 100, currency: 'INR' };
                const res = await this.client.post('/store/payment/create-order', { amount, receipt }, { headers: { 'X-Store-Token': token } });
                return res.data;
            },
            verify: async (token: string, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string, saleData: any): Promise<any> => {
                if (this.isMock) return { success: true };
                const res = await this.client.post('/store/payment/verify', {
                    razorpay_order_id: razorpayOrderId,
                    razorpay_payment_id: razorpayPaymentId,
                    razorpay_signature: razorpaySignature,
                    saleData
                }, { headers: { 'X-Store-Token': token } });
                return res.data;
            }
        }
    };

    // --- SETTINGS (DB sync) ---
    public settings = {
        get: async (): Promise<Record<string, any>> => {
            if (this.isMock) {
                await this.delay(300);
                return JSON.parse(localStorage.getItem('mock_settings') || '{}');
            }
            const res = await this.client.get('/settings');
            return res.data;
        },
        update: async (updates: Record<string, any>): Promise<{ success: boolean }> => {
            if (this.isMock) {
                await this.delay(500);
                const current = JSON.parse(localStorage.getItem('mock_settings') || '{}');
                localStorage.setItem('mock_settings', JSON.stringify({ ...current, ...updates }));
                return { success: true };
            }
            const res = await this.client.post('/settings', updates);
            return res.data;
        }
    };
}

export const api = new ApiService();
