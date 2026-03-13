# SYSTEM MASTER BLUEPRINT — NEXA POS (NexaRats)

> **Secure & Simple Inventory Control**
> Complete Production-Level System Blueprint
> Prepared by: Principal Software Architect & Product Strategist
> Date: February 2026

---

## Executive Overview

NEXA POS is a **single-page React application** for Indian small-to-medium retail businesses, offering point-of-sale (POS) billing, inventory management, customer/vendor CRM, analytics, and an integrated online storefront. The system currently operates as a **client-heavy SPA** with most data persisted in `localStorage`/`sessionStorage`, supplemented by an early-stage **Express.js + Prisma + SQLite** backend that handles authentication and basic CRUD for products, customers, and invoices.

### Technology Stack

| Layer | Technology | Version |
|---|---|---|
| **Frontend Framework** | React | 19.0.0 |
| **Build Tool** | Vite | 5.4.14 |
| **Language** | TypeScript | ~5.6.2 |
| **CSS** | TailwindCSS | 3.4.16 |
| **Charts** | Recharts | 2.15.0 |
| **Icons** | Lucide React | 0.468.0 |
| **Backend Runtime** | Node.js + Express | 5.2.1 |
| **ORM** | Prisma | 5.22.0 |
| **Database** | SQLite (dev) | file-based |
| **Auth** | JWT + bcryptjs | 9.0.3 |
| **Validation** | Zod | 4.3.6 |
| **Animation** | canvas-confetti | 1.9.3 |

### Architecture Classification

**Current State:** Monolithic SPA with an embryonic REST backend.
**Frontend-to-Backend Integration:** Disconnected — the frontend operates entirely on `localStorage`; the backend exists but is **not consumed** by the frontend in production flows.

---

## 1. Website Page Inventory (Phase 1)

The application uses **session-based page routing** via `App.tsx` — a single `activePage` state variable conditionally renders one of 14 page components. There is **no React Router**; navigation is purely state-driven.

### Complete Page Registry

| # | Page Name | Route Key | Component | File | Purpose | Access |
|---|---|---|---|---|---|---|
| 1 | Login | `login` | `Login` | `src/pages/Login.tsx` | Authentication gate | Public |
| 2 | Dashboard | `dashboard` | `Dashboard` | `src/pages/Dashboard.tsx` | Business overview & KPIs | All authenticated |
| 3 | Billing / POS | `billing` | `Billing` | `src/pages/Billing.tsx` | Point-of-sale terminal | manage/cru |
| 4 | Inventory | `inventory` | `Inventory` | `src/pages/Inventory.tsx` | Product catalog management | manage/cru/read |
| 5 | Customers | `customers` | `Customers` | `src/pages/Customers.tsx` | Customer CRM | manage/cru/read |
| 6 | Vendors | `vendors` | `Vendors` | `src/pages/Vendors.tsx` | Vendor/supplier management | manage/cru/read |
| 7 | Purchases | `purchases` | `Purchases` | `src/pages/Purchases.tsx` | Purchase order tracking | manage/cru/read |
| 8 | Expenses | `expenses` | `Expenses` | `src/pages/Expenses.tsx` | Expense tracking | manage/cru/read |
| 9 | Analytics | `analytics` | `Analytics` | `src/pages/Analytics.tsx` | Business analytics & charts | manage/cru/read |
| 10 | Reports | `reports` | `Reports` | `src/pages/Reports.tsx` | Report generation & export | manage/cru/read |
| 11 | Online Store | `online-store` | `OnlineStore` | `src/pages/OnlineStore.tsx` | E-commerce dashboard | manage/cru/read |
| 12 | Storefront | `storefront` | `Storefront` | `src/pages/Storefront.tsx` | Customer-facing store | Public (via link) |
| 13 | Admin Access | `admin` | `AdminAccess` | `src/pages/AdminAccess.tsx` | User & permission management | Super Admin only |
| 14 | Settings | `settings` | `Settings` | `src/pages/settings/Settings.tsx` | System configuration hub | manage/cru/read |

### Settings Sub-Pages (Nested within Settings)

| Sub-Page | Component | File | Purpose |
|---|---|---|---|
| Admin Profile | `ProfileSettings` | `settings/ProfileSettings.tsx` | Business identity & avatar |
| Notification | `NotificationSettings` | `settings/NotificationSettings.tsx` | Alert channel configuration |
| GST Configuration | `GSTSettings` | `settings/GSTSettings.tsx` | Indian tax compliance |
| WhatsApp | `WhatsAppSettings` | `settings/WhatsAppSettings.tsx` | WhatsApp Business API integration |
| Security & Privacy | `SecuritySettings` | `settings/SecuritySettings.tsx` | Password & 2FA management |
| Invoice Themes | `InvoiceThemes` | `settings/InvoiceThemes.tsx` | 7 printable invoice layouts |
| Reminders | `RemindersSettings` | `settings/RemindersSettings.tsx` | Automated reminder configuration |
| Account Info | `AccountInfo` | `settings/AccountInfo.tsx` | Plan & usage dashboard |
| API Keys | `ApiKeys` | `settings/ApiKeys.tsx` | Developer API key management |
| Help & Support | `HelpSupport` | `settings/HelpSupport.tsx` | FAQ & support contact |

### Shared Components

| Component | File | Purpose |
|---|---|---|
| `Sidebar` | `src/layouts/Sidebar.tsx` | Navigation sidebar with RBAC filtering |
| `Header` | `src/layouts/Header.tsx` | Top bar with search, notifications, profile |
| `Portal` | `src/components/Portal.tsx` | React Portal for modals/overlays |
| `ThemedInvoice` | `src/components/ThemedInvoice.tsx` | 7 invoice theme renderers (654 lines) |
| `StatCard` | `src/components/dashboard/StatCard.tsx` | Dashboard metric card |
| UI Components | `src/components/ui/` | TextLoop, GradientBackground, GlassButton, ConfettiCanvas |

### Layout & Routing Flow

```
App.tsx (activePage state)
├── activePage === 'login' → <Login />
└── activePage !== 'login' → <Sidebar /> + <Header /> + <PageComponent />
    ├── Sidebar filters pages by user.permissions[moduleId] !== 'none'
    ├── Header shows search, notifications, profile dropdown
    └── Each page checks permissionLevel for read-only mode
```

### RBAC Permission Model (4 Levels)

| Level | Description | UI Behavior |
|---|---|---|
| `manage` | Full control | All CRUD + admin actions |
| `cru` | Create, Read, Update | CRUD allowed, no admin actions |
| `read` | View only | Orange "View Only Mode" banner, no mutations |
| `none` | No access | Page hidden from sidebar |

**Super Admin** bypasses all permission checks (hardcoded: `admin@nexarats.com` / `admin@nexapos.com` with password `admin123`).

---

## 2. User Journey Analysis (Phase 2)

### Journey 1: First-Time Visitor → Super Admin Login

1. User loads app → `Login.tsx` renders with pre-filled credentials (`admin@nexarats.com` / `admin123`)
2. User clicks "Login" → `handleSubmit` fires with 1200ms simulated delay
3. Credential check: hardcoded default admin OR lookup in `localStorage('nx_admin_users')`
4. On success → `onLogin(user)` stores user in `sessionStorage('nxCurrentUser')`, sets `activePage = 'dashboard'`
5. Sidebar renders all 14 navigation items (Super Admin has full access)
6. Dashboard shows 6 stat cards, performance charts, customer/vendor analytics

**Edge Cases:** No "forgot password" flow exists. No session expiry. No server-side auth validation in the frontend flows.

### Journey 2: Admin Invites New User

1. Super Admin navigates to Admin Access page
2. Clicks "+ Invite Admin" → modal with name, email, role, password fields
3. Permission matrix: 10 modules × 4 levels (manage/cru/read/none) with toggle/cycle buttons
4. On save → user added to `localStorage('nx_admin_users')` array
5. "View Credentials" button generates URL with `?view_creds=true&login_email=...&login_password=...&perms=...`
6. URL opened → Login page shows "Access Authorized" credential slip card
7. "Proceed to Login" pre-fills credentials, user logs in with assigned permissions

**Security Risk:** Credentials passed via URL query parameters in plaintext.

### Journey 3: Billing / POS Transaction

1. Staff navigates to Billing → product grid with search/filter
2. Clicks product → added to cart with quantity controls
3. Cart shows real-time GST calculation (CGST + SGST split)
4. Selects payment method (Cash/Card/UPI/Online/Credit)
5. If customer selected → transaction linked to customer record
6. Clicks "Complete Sale" → transaction stored in `localStorage`, stock auto-decremented
7. Invoice modal appears with themed layout → print via browser print API
8. Transaction appears in Dashboard stats and customer history

**Blocking Conditions:** Empty cart, zero total amount.

### Journey 4: Inventory Management

1. User navigates to Inventory → product table with filters (category, stock status)
2. "+ Add Product" opens 18-field form (name, SKU, category, MRP, selling price, GST rate, stock, unit, image)
3. Smart profit calculation: Profit = Selling Price - Purchase Price, Margin % auto-calculated
4. Image upload via FileReader → base64 stored in localStorage
5. Import products via JSON file upload
6. Edit/Delete with confirmation modal (RBAC: `read` users see view-only mode)

### Journey 5: Online Storefront Flow

1. Admin clicks "Visit Store" from Online Store dashboard
2. `activePage` changes to `storefront` — customer-facing product catalog
3. Customer browses products → adds to cart → enters name/phone/address
4. Checkout → `onCheckoutSuccess` callback creates transaction, decrements stock
6. "Back to Admin" button returns to management view

### Journey 6: Error & Edge Cases

- Invalid login → "Invalid email or password" red alert
- Deactivated account → "Your account has been deactivated" message
- Empty states → illustrated empty state messages across all list pages
- Low stock → orange "Low Stock" badge, products flagged in Dashboard stats

### Journey 7: Logout

1. User clicks logout in Sidebar or Settings
2. `sessionStorage.clear()` → `window.location.reload()`
3. No server-side session invalidation (client-only auth)

---

## 3. Page-Level Breakdown with Button & Interaction Analysis (Phases 3-5)

### 3.1 Login Page (`Login.tsx` — 376 lines)

**Interactive Elements:**

| Element | Type | Event Handler | Action |
|---|---|---|---|
| Login Button | Submit | `handleSubmit` | Validates creds against hardcoded admin + localStorage admins |
| Remember Me | Checkbox | `setRememberMe` | State toggle only (not persisted) |
| Proceed to Login | Button | `onClick` | Pre-fills email/password from URL creds, clears view mode |

**Backend API:** None — authentication is entirely client-side.
**Database Impact:** None — reads `localStorage('nx_admin_users')`.
**Security Issues:** Default credentials hardcoded. URL-based credential passing. No rate limiting. No CAPTCHA.

### 3.2 Dashboard (`Dashboard.tsx` — 418 lines)

**Interactive Elements:**

| Element | Type | Event Handler | Action |
|---|---|---|---|
| Daily/Weekly/Monthly filter | Button group | `setTimeFilter` | Filters performance chart data |
| Calendar date picker | Button + Popover | `setShowDatePicker` | Opens date filter for customer analytics |
| Date Apply | Button | `setShowDatePicker(false)` | Closes picker (no actual filter applied) |

**Data Sources:** All computed from props (`products`, `customers`, `vendors`, `transactions`, `purchases`).
**Key Computations:** inventoryValue, lowStockCount, totalProfit, profitMargin, todaySales, online vs offline sales split, vendor payment overview (pie chart).
**Database Impact:** Read-only aggregation page.

### 3.3 Billing / POS (`Billing.tsx` — ~826 lines)

**Interactive Elements:**

| Element | Type | Action |
|---|---|---|
| Product cards | Click | Add to cart |
| +/- Quantity | Buttons | Increment/decrement cart item |
| Remove from cart | Button | Delete cart item |
| Payment method selector | Radio/Button group | Set payment method |
| Customer search | Search input | Filter customer list |
| Apply Coupon | Button | Apply discount code |
| Complete Sale | Button | Create transaction, decrement stock, generate invoice |
| Print Invoice | Button | `window.print()` with themed layout |
| New Sale | Button | Reset cart and form |
| Quick Amount buttons | Buttons | Pre-fill cash amounts |

**Backend API Required:** `POST /api/invoices`, `PATCH /api/products/:id/stock`
**Database Impact:** Creates Transaction, decrements Product.stock, updates Customer.totalPaid/pending.

### 3.4 Inventory (`Inventory.tsx` — ~1116 lines)

**Interactive Elements:**

| Element | Type | Action |
|---|---|---|
| + Add Product | Button | Opens 18-field product form modal |
| Edit product | Button | Populates form with product data |
| Delete product | Button | Removes from array with confirmation |
| Import JSON | File input | Parses JSON file, merges products |
| Category filter | Dropdown | Filters product table |
| Stock status filter | Dropdown | Filters by In Stock/Low Stock/Out of Stock |
| Search | Input | Real-time text search |
| Image upload | File input | FileReader → base64 string |
| Bulk select checkboxes | Checkbox | Multi-select for bulk operations |

**Backend API Required:** Full CRUD `GET/POST/PUT/DELETE /api/products`
**Database Impact:** Product table — create, update, delete operations.

### 3.5 Customers (`Customers.tsx` — 745 lines)

**Interactive Elements:** Add Customer, Edit, Delete, View Profile, Print Invoice, Export (CSV/PDF/Excel), Bulk Select, Search, Filter, Transaction History.
**Backend API Required:** Full CRUD `/api/customers`, `GET /api/customers/:id/transactions`
**Database Impact:** Customer table CRUD, read-joins with Transaction/Invoice tables.

### 3.6 Vendors (`Vendors.tsx` — 733 lines)

**Interactive Elements:** Add Vendor, Edit, Delete, View Profile, Image Upload, Export, Bulk Select, Search, Filter, Purchase History.
**Backend API Required:** Full CRUD `/api/vendors`, `GET /api/vendors/:id/purchases`
**Database Impact:** Vendor table CRUD, read-joins with PurchaseOrder table.

### 3.7 Purchases (`Purchases.tsx` — 140 lines)

**Interactive Elements:** Add Purchase, Edit, Delete, Search, Status Filter, Vendor lookup.
**Backend API Required:** Full CRUD `/api/purchases`
**Database Impact:** PurchaseOrder table CRUD.

### 3.8 Expenses (`Expenses.tsx` — 285 lines)

**Interactive Elements:** Add Expense (description, amount, category, date, status, payment method), Edit, Delete, Search, Category Filter.
**Backend API Required:** Full CRUD `/api/expenses`
**Database Impact:** Expense table CRUD (table does not yet exist in schema).

### 3.9 Analytics (`Analytics.tsx` — 231 lines)

**Interactive Elements:** Read-only — no mutations. Charts: Area chart (revenue trend), Bar chart (category breakdown), Pie chart (stock distribution).
**Backend API Required:** `GET /api/analytics/summary`
**Database Impact:** Aggregation queries only.

### 3.10 Reports (`Reports.tsx` — 167 lines)

**Interactive Elements:** Report type selector (Sales, Inventory, Financial, Customer), Date range filter, Download/Export button.
**Backend API Required:** `GET /api/reports/:type?from=&to=`
**Database Impact:** Read-only analytical queries.

### 3.11 Online Store (`OnlineStore.tsx` — 377 lines)

**Interactive Elements:** Visit Store button, Order status update dropdown.
**Backend API Required:** `GET/PATCH /api/orders`
**Database Impact:** Order status updates.

### 3.12 Storefront (`Storefront.tsx` — 665 lines)

**Interactive Elements:** Category filter, Search, Add to Cart, +/- Quantity, Remove from Cart, Place Order (with customer info), Back to Admin.
**Backend API Required:** `GET /api/storefront/products`, `POST /api/storefront/orders`
**Database Impact:** Creates orders, decrements stock.

### 3.13 Admin Access (`AdminAccess.tsx` — 646 lines)

**Interactive Elements:** Invite Admin, Edit User Permissions, Toggle User Status, Delete User, View Credentials, Permission Matrix (10 modules × 4 levels), Search.
**Backend API Required:** Full CRUD `/api/admin/users`, `PATCH /api/admin/users/:id/permissions`
**Database Impact:** AdminUser table CRUD, permission records.

### 3.14 Settings (`Settings.tsx` + 10 sub-pages)

**Interactive Elements per Sub-Page:**

| Sub-Page | Key Actions | Storage Key |
|---|---|---|
| ProfileSettings | Save profile, Upload avatar | `inv_admin_profile` |
| NotificationSettings | Toggle 8 notification channels | `nx_notification_settings` |
| GSTSettings | Configure GSTIN, tax components | `nx_gst_config` |
| WhatsAppSettings | API config, message templates | `nx_whatsapp_config` |
| SecuritySettings | Change password, toggle 2FA | `nx_security_settings` |
| InvoiceThemes | Select from 7 themes, preview | `nx_selected_invoice_theme` |
| RemindersSettings | Auto-reminder config | `nx_reminder_settings` |
| AccountInfo | View plan & usage (static) | None |
| ApiKeys | Generate/Revoke/Delete API keys | `nx_api_keys` |
| HelpSupport | FAQ accordion, Contact form | None |

---

## 4. Backend Architecture (Phases 4 & 7)

### Current Backend State

The server (`server/src/index.ts`) is minimal with only 5 routes:

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Create user account with bcrypt hashing |
| POST | `/api/auth/login` | None | Authenticate, return JWT (7-day expiry) |
| GET | `/api/health` | None | Health check |
| GET | `/api/products` | None | List all products |
| POST | `/api/products` | None | Create product (no validation) |
| GET | `/api/customers` | None | List customers with invoices |
| GET | `/api/invoices` | None | List invoices with items and customers |

**Critical Gaps:** No auth middleware applied to CRUD routes. No input validation. No error handling middleware. No CORS restrictions. Hardcoded JWT fallback secret.

### Recommended Full Backend Architecture

```
Architecture: Modular Monolith (recommended for current scale)

├── API Gateway Layer
│   ├── Express.js with helmet, cors, rate-limiting
│   ├── JWT authentication middleware
│   └── Role-based authorization middleware
│
├── Service Layer
│   ├── AuthService (register, login, refresh, password reset)
│   ├── ProductService (CRUD, stock management, bulk import)
│   ├── CustomerService (CRUD, transaction history, segmentation)
│   ├── VendorService (CRUD, purchase history)
│   ├── BillingService (invoice creation, payment processing, returns)
│   ├── PurchaseService (PO management, vendor payments)
│   ├── ExpenseService (CRUD, category analytics)
│   ├── AnalyticsService (aggregations, KPIs, trend analysis)
│   ├── ReportService (generation, export PDF/CSV/Excel)
│   ├── StorefrontService (public catalog, orders)
│   ├── AdminService (user management, RBAC, audit logging)
│   ├── NotificationService (email, SMS, WhatsApp, push)
│   └── SettingsService (business config, GST, themes)
│
├── Data Access Layer
│   ├── Prisma ORM with PostgreSQL (production)
│   ├── Redis (session cache, rate limiting)
│   └── S3/CloudStorage (images, documents)
│
├── Background Jobs
│   ├── BullMQ queue (Redis-backed)
│   ├── Scheduled reminders (payment due, low stock)
│   ├── Report generation (async PDF/Excel)
│   └── WhatsApp message dispatch
│
└── Infrastructure
    ├── Winston/Pino structured logging
    ├── Sentry error tracking
    └── Prometheus metrics
```

### Required API Endpoints Design

**Authentication & Authorization**

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new business account |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/forgot-password` | Initiate password reset |
| POST | `/api/auth/reset-password` | Complete password reset |
| GET | `/api/auth/me` | Get current user profile |

**Products**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/products` | List with pagination, filters, search |
| GET | `/api/products/:id` | Get single product |
| POST | `/api/products` | Create product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Soft-delete product |
| POST | `/api/products/bulk-import` | Import from JSON/CSV |
| PATCH | `/api/products/:id/stock` | Adjust stock |

**Customers, Vendors, Invoices, Purchases, Expenses** — follow identical CRUD patterns.

**Analytics & Reports**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | Dashboard KPIs |
| GET | `/api/analytics/sales` | Sales analytics with date range |
| GET | `/api/analytics/inventory` | Inventory health metrics |
| GET | `/api/reports/generate` | Generate report (params: type, format, dateRange) |
| GET | `/api/reports/:id/download` | Download generated report |

**Admin**

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List admin users |
| POST | `/api/admin/users` | Invite new admin |
| PUT | `/api/admin/users/:id` | Update user & permissions |
| DELETE | `/api/admin/users/:id` | Remove admin user |

---

## 5. Database Architecture (Phases 5 & 8)

### Current Schema (Prisma + SQLite)

5 models exist: `User`, `Product`, `Customer`, `Invoice`, `InvoiceItem`.

### Recommended Production Schema (PostgreSQL)

**Recommendation: PostgreSQL** — chosen for ACID compliance, complex joins for analytics, JSON column support for flexible metadata, mature ecosystem, and excellent Prisma support.

**Complete Entity Design:**

| Entity | Key Fields | Relations |
|---|---|---|
| **User** | id, email, password, name, phone, role, permissions (JSON), status, lastLogin | → Invoice[], AdminAuditLog[] |
| **Business** | id, name, address, phone, email, gstNumber, logo, plan, config (JSON) | → User[], Product[], Customer[] |
| **Product** | id, businessId, name, sku (unique), category, mrp, sellingPrice, purchasePrice, gstRate, stock, minStock, unit, image, status, isDeleted | → InvoiceItem[], StockMovement[] |
| **Customer** | id, businessId, name, email, phone, address, totalPaid, pending, status, segment | → Invoice[] |
| **Vendor** | id, businessId, name, email, phone, company, address, gstNumber, totalPaid, pendingAmount | → PurchaseOrder[] |
| **Invoice** | id, businessId, number (unique), customerId, userId, subtotal, gstAmount, total, method, status, source, theme, discount | → InvoiceItem[] |
| **InvoiceItem** | id, invoiceId, productId, quantity, unitPrice, gstRate, gstAmount, total | |
| **PurchaseOrder** | id, businessId, vendorId, items (JSON), total, status, date, paymentMethod | |
| **Expense** | id, businessId, description, amount, category, date, status, paymentMethod, createdBy | |
| **StockMovement** | id, productId, type (IN/OUT/ADJUST), quantity, reference, timestamp | |
| **AdminAuditLog** | id, userId, action, entity, entityId, changes (JSON), ip, timestamp | |
| **Setting** | id, businessId, key, value (JSON) | |
| **ApiKey** | id, businessId, name, keyHash, status, lastUsed, createdAt | |

**Indexing Strategy:** Composite indexes on (businessId, createdAt), (businessId, status), unique on (businessId, sku). Full-text search index on Product.name, Customer.name.

**Scaling Strategy:** Table partitioning on Invoice/StockMovement by date range. Read replicas for analytics queries. Connection pooling via PgBouncer.

---

## 6. Frontend Architecture Analysis (Phase 6)

### Framework & Build

- **React 19** with functional components and hooks throughout
- **Vite** for fast HMR development and optimized production builds
- **TypeScript** with strict mode for type safety
- **TailwindCSS 3.4** for utility-first styling

### Component Hierarchy

```
App.tsx (Root — 325 lines, state orchestrator)
├── Login.tsx (auth gate)
└── Authenticated Layout
    ├── Sidebar.tsx (navigation, RBAC filtering)
    ├── Header.tsx (search, notifications, profile)
    └── Active Page Component
        ├── Page-level state (useState/useLocalStorage)
        ├── Modal components (inline, rendered via Portal)
        └── ThemedInvoice (shared invoice renderer)
```

### State Management

**Current Pattern:** All state lives in `App.tsx` and is passed via props. Custom hooks wrap `localStorage` and `sessionStorage`.

| Storage Key | Purpose | Used By |
|---|---|---|
| `nxCurrentUser` | Session auth (sessionStorage) | App.tsx |
| `inv_products` | Product catalog | App.tsx → Inventory, Billing |
| `inv_customers` | Customer records | App.tsx → Customers, Billing |
| `inv_vendors` | Vendor records | App.tsx → Vendors |
| `inv_transactions` | Billing transactions | App.tsx → Dashboard, Analytics |
| `inv_purchases` | Purchase orders | App.tsx → Purchases |
| `nx_admin_users` | Admin user list | Login, AdminAccess |
| `inv_admin_profile` | Business profile | Header, Settings, Invoices |
| `nx_selected_invoice_theme` | Active invoice theme | Billing, Customers |
| `nx_gst_config` | GST configuration | GSTSettings |
| `nx_whatsapp_config` | WhatsApp settings | WhatsAppSettings |
| `nx_notification_settings` | Alert preferences | NotificationSettings |
| `nx_security_settings` | Security config | SecuritySettings |
| `nx_api_keys` | API key records | ApiKeys |
| `nx_reminder_settings` | Reminder preferences | RemindersSettings |

**Performance Concerns:**
- Large localStorage payloads (base64 images stored inline)
- No lazy loading — all 14 pages imported eagerly in App.tsx
- No React.memo or useMemo optimization on list renders
- ThemedInvoice (654 lines) loaded regardless of which theme is active

### Reusable Components Audit

| Component | Reuse Count | Quality |
|---|---|---|
| Portal | 3+ pages | Good — proper mount/unmount |
| ThemedInvoice | Billing, Customers | Good — 7 themes, shared |
| StatCard | Dashboard only | Could be extracted globally |
| ToggleSwitch | 4+ settings pages | Duplicated inline — should be shared |

### Accessibility Assessment

- ❌ No ARIA labels on interactive elements
- ❌ No keyboard navigation support
- ❌ No focus management for modals
- ❌ Color contrast issues (light gray text on white backgrounds)
- ❌ No screen reader support
- ⚠️ Some semantic HTML (buttons, forms) but inconsistent

### SEO Readiness

- ❌ SPA with no SSR/SSG — invisible to search engines
- ❌ Single `index.html` with minimal meta tags
- ❌ No Open Graph / Twitter Card metadata
- ❌ No sitemap or robots.txt
- ⚠️ Storefront page would benefit from SSR for discoverability

---

## 7. DevOps & Infrastructure Architecture (Phase 9)

### Recommended Production Stack

```
Cloud Provider: AWS (recommended) or GCP

├── Frontend
│   ├── Vercel or AWS CloudFront + S3
│   ├── CDN with edge caching
│   └── Environment: staging.nexapos.com / app.nexapos.com
│
├── Backend
│   ├── AWS ECS Fargate or Railway.app
│   ├── Auto-scaling: 2-8 containers based on CPU/request count
│   ├── Health checks on /api/health
│   └── Blue-green deployment strategy
│
├── Database
│   ├── AWS RDS PostgreSQL (primary)
│   ├── Read replica for analytics
│   └── Automated daily backups (35-day retention)
│
├── Cache
│   ├── AWS ElastiCache Redis
│   ├── Session storage
│   └── Rate limiting counters
│
├── Storage
│   ├── AWS S3 for product images, invoices, exports
│   └── CloudFront CDN for static assets
│
├── CI/CD Pipeline
│   ├── GitHub Actions
│   ├── Lint → Type Check → Test → Build → Deploy
│   ├── Preview deployments for PRs
│   └── Automatic rollback on health check failure
│
├── Monitoring
│   ├── Sentry (error tracking)
│   ├── CloudWatch / Datadog (metrics)
│   ├── PagerDuty (alerting)
│   └── LogRocket (session replay for frontend)
│
└── Security
    ├── AWS WAF (Web Application Firewall)
    ├── SSL/TLS via ACM
    ├── Secrets Manager for env vars
    └── VPC with private subnets for DB/Redis
```

### Environment Separation

| Environment | Purpose | Database | Deployment |
|---|---|---|---|
| `development` | Local dev | SQLite file | `npm run full` |
| `staging` | QA testing | PostgreSQL (isolated) | Auto on `develop` branch |
| `production` | Live users | PostgreSQL (RDS) | Manual or auto on `main` tag |

---

## 8. Security Audit (Phase 10)

### Critical Vulnerabilities

| # | Severity | Issue | Location | Recommendation |
|---|---|---|---|---|
| 1 | 🔴 CRITICAL | Hardcoded default admin credentials | `Login.tsx:155` | Remove, force initial setup wizard |
| 2 | 🔴 CRITICAL | Credentials passed in URL query parameters | `Login.tsx:110-136`, `AdminAccess.tsx` | Use encrypted token with expiry |
| 3 | 🔴 CRITICAL | All data in localStorage (no encryption) | All pages | Migrate to server-side storage |
| 4 | 🔴 CRITICAL | JWT secret fallback to `'super-secret-key'` | `auth.ts:40`, `middleware/auth.ts:17` | Require env variable, fail on missing |
| 5 | 🟠 HIGH | No auth middleware on CRUD routes | `server/src/index.ts:24-64` | Apply `authMiddleware` to all routes |
| 6 | 🟠 HIGH | No input validation on API routes | `server/src/index.ts:33-40` | Add Zod schemas (already in deps) |
| 7 | 🟠 HIGH | `req.body` passed directly to Prisma | `server/src/index.ts:35` | Whitelist allowed fields |
| 8 | 🟠 HIGH | No CORS origin restriction | `server/src/index.ts:13` | Configure allowed origins |
| 9 | 🟠 HIGH | No rate limiting | All routes | Add `express-rate-limit` |
| 10 | 🟡 MEDIUM | No CSRF protection | All forms | Add CSRF tokens for state-changing ops |
| 11 | 🟡 MEDIUM | No Content Security Policy | `index.html` | Add CSP headers |
| 12 | 🟡 MEDIUM | External QR code API call with user data | `ThemedInvoice.tsx:390` | Generate QR client-side |
| 13 | 🟡 MEDIUM | `window.confirm` for destructive actions | Multiple pages | Use custom confirmation modal |
| 14 | 🟢 LOW | No password complexity requirements | `AdminAccess.tsx` | Enforce min length, complexity |
| 15 | 🟢 LOW | "Remember me" checkbox has no effect | `Login.tsx:103` | Implement persistent session |

---

## 9. UX & Product Gap Analysis (Phase 11)

### Dead Buttons & Missing Functionality

| Element | Location | Issue |
|---|---|---|
| Date picker "Apply" button | Dashboard | Closes picker but doesn't filter data |
| "Filters" button | Dashboard vendor section | No filter UI implemented |
| "Delete Account" button | Settings | No handler — button is decorative |
| "Remember me" checkbox | Login | State set but never persisted or used |
| Theme preview "Print" button | InvoiceThemes | Only preview, no actual print integration |
| Report "Download" buttons | Reports | No file generation — UI only |

### UX Improvements Recommended

1. **Missing onboarding:** No setup wizard for first-time users — business name, GST config, first product
2. **No empty state guidance:** Some pages show bare empty states without actionable guidance
3. **Confirmation inconsistency:** Mix of `window.confirm()` and no confirmation for destructive actions
4. **No undo/redo:** Deletions are immediate and irreversible
5. **Mobile responsiveness:** Dashboard 6-column grid breaks on mobile. Sidebar collapse works but some pages have fixed-width layouts
6. **No search results feedback:** Search in header has no global search implementation
7. **Missing breadcrumbs:** Settings sub-pages have no back navigation context
8. **No loading skeletons:** Pages show no loading indicators during data fetches
9. **Confetti overuse:** canvas-confetti fires on nearly every save action — should be reserved for milestones

---

## 10. SaaS Product Strategy (Phase 12)

### Core Product Value

NEXA POS is a **Vyapar-style GST-compliant billing and inventory management system** targeting Indian MSMEs (micro, small & medium enterprises). Its core value proposition is unified POS + Inventory + CRM + Online Store in a single platform.

### User Personas

| Persona | Description | Primary Modules |
|---|---|---|
| **Retail Shop Owner** | Single-store owner managing daily sales | Billing, Inventory, Dashboard |
| **Wholesale Distributor** | Manages bulk orders and vendor relationships | Vendors, Purchases, Inventory |
| **Restaurant Owner** | Quick billing with themed invoices | Billing (Restaurant theme), Dashboard |
| **E-commerce Seller** | Online + offline hybrid | Online Store, Storefront, Reports |
| **Accountant/Bookkeeper** | Financial oversight and reporting | Reports, Analytics, Expenses |

### Monetization Strategy

| Tier | Price | Features |
|---|---|---|
| **Free** | ₹0/mo | 50 products, 1 user, basic billing, 100 invoices/mo |
| **Starter** | ₹499/mo | 500 products, 3 users, all reports, WhatsApp |
| **Professional** | ₹999/mo | 5000 products, 10 users, Online Store, API access |
| **Enterprise** | ₹2499/mo | Unlimited everything, priority support, custom integrations |

### Missing SaaS Modules to Build

1. **Multi-branch support** — centralized inventory across locations
2. **Barcode scanner integration** — camera-based or hardware scanner
3. **Payment gateway integration** — Razorpay/Stripe for online orders
4. **Automated GST filing** — GSTR-1/3B generation
5. **Loyalty program** — points, rewards, tiered membership
6. **Staff attendance & payroll** — employee management
7. **Delivery tracking** — order dispatch and tracking
8. **Multi-currency support** — for export businesses
9. **Marketplace connectors** — Amazon, Flipkart sync
10. **Mobile app** — React Native companion app

---

## 11. Complete System Architecture (Phase 13)

### End-to-End Request Flow

```
Browser (React SPA)
    ↓ User Action (click, form submit)
    ↓ React Event Handler
    ↓ State Mutation (useState/useLocalStorage)
    ↓ — Currently stops here (client-only) —
    ↓
    ↓ [RECOMMENDED FLOW BELOW]
    ↓
    ↓ HTTP Request (Axios/fetch)
    ↓
API Gateway (Express.js)
    ↓ CORS validation
    ↓ Rate limiting (express-rate-limit + Redis)
    ↓ JWT Authentication (middleware/auth.ts)
    ↓ Role Authorization (permission check)
    ↓ Request Validation (Zod schemas)
    ↓
Service Layer
    ↓ Business Logic
    ↓ Transaction management
    ↓
Data Access (Prisma ORM)
    ↓ PostgreSQL (primary data)
    ↓ Redis (cache hot data)
    ↓ S3 (file storage)
    ↓
Background Workers (BullMQ)
    ↓ Invoice PDF generation
    ↓ WhatsApp notifications
    ↓ Scheduled reminders
    ↓ Report generation
    ↓
Response
    ↓ JSON response with pagination metadata
    ↓ Error handling (standardized error codes)
    ↓
Browser
    ↓ React state update
    ↓ UI re-render
    ↓ Optimistic updates where appropriate
```

---

## 12. Deployment, Scaling & Disaster Recovery (Phases 9 continued)

### Scaling Strategy

| Component | Scaling Approach |
|---|---|
| Frontend | CDN edge caching, code splitting, lazy loading |
| API Server | Horizontal scaling (2-8 containers), auto-scale on CPU > 70% |
| Database | Read replicas for analytics, connection pooling, table partitioning by date |
| Redis | Cluster mode for high availability |
| File Storage | S3 with lifecycle policies (archive after 1 year) |

### Disaster Recovery Plan

| Aspect | Strategy | RPO | RTO |
|---|---|---|---|
| Database | Automated daily snapshots + point-in-time recovery | 5 min | 30 min |
| Application | Blue-green deployment, instant rollback | 0 | 5 min |
| Files/Images | S3 cross-region replication | 15 min | 15 min |
| Secrets | AWS Secrets Manager with rotation | 0 | 10 min |

### Monitoring & Alerting

| Metric | Threshold | Alert |
|---|---|---|
| API response time | > 2s p95 | PagerDuty |
| Error rate | > 1% | PagerDuty |
| Database connections | > 80% pool | Slack |
| Disk usage | > 80% | Email |
| Failed logins | > 10 in 5min | Security team |
| Stock level | < min threshold | Business owner WhatsApp |

---

## 13. Future Expansion Plan

### Phase 1 (0-3 months) — Foundation

- [ ] Migrate all localStorage data to server-side PostgreSQL
- [ ] Implement proper JWT auth flow with refresh tokens
- [ ] Add input validation (Zod) to all API routes
- [ ] Implement React Router for proper URL routing
- [ ] Add lazy loading for page components
- [ ] Fix all security vulnerabilities (Section 8)

### Phase 2 (3-6 months) — Product Market Fit

- [ ] Multi-tenant architecture (Business entity isolation)
- [ ] Payment gateway integration (Razorpay)
- [ ] WhatsApp Business API (actual integration vs. config-only)
- [ ] Mobile-responsive redesign
- [ ] Barcode/QR scanner support
- [ ] Automated GST report generation

### Phase 3 (6-12 months) — Scale

- [ ] React Native mobile app
- [ ] Multi-branch inventory sync
- [ ] Marketplace integrations (Amazon, Flipkart)
- [ ] Advanced analytics with AI-powered insights
- [ ] Loyalty program engine
- [ ] Staff management & payroll module

### Phase 4 (12+ months) — Enterprise

- [ ] Custom workflow builder
- [ ] White-label solution for resellers
- [ ] Offline-first PWA capability
- [ ] International expansion (multi-currency, multi-language)
- [ ] API marketplace for third-party integrations

---

## Appendix A: File Structure Map

```
nexarats---secure-&-simple-inventory-control/
├── index.html                          # SPA entry point
├── package.json                        # Frontend dependencies
├── vite.config.ts                      # Vite build configuration
├── tailwind.config.ts                  # TailwindCSS configuration
├── tsconfig.json                       # TypeScript configuration
├── postcss.config.js                   # PostCSS (TailwindCSS)
├── .env.local                          # Frontend env vars
├── src/
│   ├── index.tsx                       # React DOM render entry
│   ├── index.css                       # Global styles + Tailwind directives
│   ├── App.tsx                         # Root component (325 lines)
│   ├── types/index.ts                  # TypeScript interfaces (109 lines)
│   ├── data/mockData.ts                # Default seed data (92 lines)
│   ├── utils/cn.ts                     # Class name utility
│   ├── hooks/
│   │   ├── useLocalStorage.ts          # localStorage wrapper hook
│   │   └── useSessionStorage.ts        # sessionStorage wrapper hook
│   ├── layouts/
│   │   ├── Sidebar.tsx                 # Navigation sidebar (139 lines)
│   │   └── Header.tsx                  # Top header bar (111 lines)
│   ├── components/
│   │   ├── Portal.tsx                  # React Portal (22 lines)
│   │   ├── ThemedInvoice.tsx           # 7 invoice themes (654 lines)
│   │   ├── auth/                       # Auth components
│   │   ├── dashboard/StatCard.tsx      # Dashboard stat card
│   │   └── ui/                         # Shared UI (TextLoop, GradientBg, etc.)
│   └── pages/
│       ├── Login.tsx                   # Login page (376 lines)
│       ├── Dashboard.tsx               # Dashboard (418 lines)
│       ├── Billing.tsx                 # POS terminal (~826 lines)
│       ├── Inventory.tsx               # Product management (~1116 lines)
│       ├── Customers.tsx               # Customer CRM (745 lines)
│       ├── Vendors.tsx                 # Vendor management (733 lines)
│       ├── Purchases.tsx               # Purchase orders (140 lines)
│       ├── Expenses.tsx                # Expense tracking (285 lines)
│       ├── Analytics.tsx               # Analytics charts (231 lines)
│       ├── Reports.tsx                 # Report generation (167 lines)
│       ├── OnlineStore.tsx             # E-commerce dashboard (377 lines)
│       ├── Storefront.tsx              # Customer store (665 lines)
│       ├── AdminAccess.tsx             # Admin user management (646 lines)
│       └── settings/
│           ├── Settings.tsx            # Settings hub (109 lines)
│           ├── ProfileSettings.tsx     # Profile config (107 lines)
│           ├── NotificationSettings.tsx # Notification config (83 lines)
│           ├── GSTSettings.tsx         # GST config (91 lines)
│           ├── WhatsAppSettings.tsx    # WhatsApp config (118 lines)
│           ├── SecuritySettings.tsx    # Security config (136 lines)
│           ├── InvoiceThemes.tsx       # Theme selector (561 lines)
│           ├── RemindersSettings.tsx   # Reminder config (148 lines)
│           ├── AccountInfo.tsx         # Account info (85 lines)
│           ├── ApiKeys.tsx             # API key management (149 lines)
│           └── HelpSupport.tsx         # Help & FAQ (134 lines)
├── server/
│   ├── package.json                    # Backend dependencies
│   ├── .env                            # Backend env vars
│   ├── prisma/
│   │   ├── schema.prisma              # Database schema (78 lines)
│   │   ├── dev.db                     # SQLite dev database
│   │   └── migrations/                # Prisma migrations
│   └── src/
│       ├── index.ts                   # Express server (69 lines)
│       ├── routes/auth.ts             # Auth routes (49 lines)
│       └── middleware/auth.ts         # JWT middleware (24 lines)
└── dist/                              # Production build output
```

## Appendix B: localStorage Keys Registry

| Key | Type | Size Risk | Migration Priority |
|---|---|---|---|
| `nxCurrentUser` | Session object | Low | P0 — move to server sessions |
| `inv_products` | Product[] with base64 images | **HIGH** | P0 — images to S3, data to DB |
| `inv_customers` | Customer[] | Medium | P0 — move to DB |
| `inv_vendors` | Vendor[] | Medium | P0 — move to DB |
| `inv_transactions` | Transaction[] | **HIGH** (grows unbounded) | P0 — move to DB |
| `inv_purchases` | PurchaseOrder[] | Medium | P1 |
| `nx_admin_users` | AdminUser[] with passwords | **CRITICAL** | P0 — passwords must be hashed server-side |
| `inv_admin_profile` | Profile object | Low | P1 |
| `nx_*_config` | Various settings | Low | P2 |
| `nx_api_keys` | API key records | Medium | P1 — keys should be server-managed |

---

## 14. Developer Handoff (Backend Integration)

To facilitate smooth integration with the backend, the following tools and contracts have been implemented:

### 1. Unified API Schemas (Zod)
Located in `src/schemas/index.ts`. These schemas define the **validation contract** for all core entities (Products, Customers, Invoices, etc.).
- **Backend use:** These same schemas can be used in the Node.js backend for request body validation.
- **Frontend use:** Form validation and type inference.

### 2. API Service Layer
Located in `src/services/api.service.ts`. This service abstracts all backend communication.
- **Mock Mode:** Currently performs operations on `localStorage`, but follows standard REST/async patterns.
- **Production Mode:** Switching `isMock = false` will trigger real HTTP calls via Axios to the base URL.
- **Implementation:** It standardizes error handling and response types, acting as a "skeleton" for the backend to flesh out.

### 3. Shared Types
Located in `src/types/index.ts`. These types are aligned with the Prisma schema outlined in `backend.md`. They serve as the source of truth for data shapes across the app.

### 4. Environment Configuration
Template provided in `.env.example`. 
- `VITE_API_BASE_URL`: Entry point for the backend.
- `VITE_USE_MOCKS`: Toggle between `localStorage` and real API.

---

> **END OF SYSTEM MASTER BLUEPRINT**

> This document represents a complete architectural analysis of the NEXA POS codebase.
> All findings are based on static code analysis performed February 2026.
