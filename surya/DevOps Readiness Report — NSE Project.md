# DevOps Readiness Report — NSE Project

## **1\. Project Architecture Overview**

The NSE repository is a multi-service monorepo consisting of:

- **Marketing Landing**: React (Vite/TS) - Public marketing site.
- **Nexarats Admin**: React (Vite/TS) - Multi-tenant SaaS admin panel.
- **Nexarats Inventory (INV) Frontend**: React (Vite/TS) - Core inventory management UI.
- **Nexarats Inventory (INV) Backend**: Node.js (Express/TS) - Central API server with Supabase integration.
- **WhatsApp Service**: Node.js (Express) - Standalone service for WhatsApp automation via `whatsapp-web.js`.

---

## **2\. Frontend Deployment Requirements**

### **Build & Stack**

- Framework: Vite + React 19
- Styling: Tailwind CSS 4.0
- Build Output: `dist/`

### **Service Ports**

| **Service** | **Default Port** |
| --- | --- |
| Marketing Landing | 3000 |
| Admin Panel | 5173 |
| Inventory Frontend | 3000 |

### **Environment Variables (VFE)**

| **Variable** | **Description** | **Usage** |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Backend API URL | Core API communication |
| `VITE_WHATSAPP_API_URL` | WhatsApp Service URL | QR/Status management |
| `VITE_USE_MOCKS` | Mock Mode Toggle | `true` for offline demo, `false` for prod |
| `VITE_WA_API_KEY` | WhatsApp Auth Key | Security for WA service calls |
| `VITE_ADMIN_API_URL` | Admin API Base | Used by Admin Panel |

---

## **3\. Backend Deployment Requirements**

### **Inventory Backend (API)**

- Runtime: Node.js 20+
- Framework: Express + TypeScript
- Database: Supabase (PostgreSQL)
- Security: JWT (Access/Refresh), Rate Limiting, Helmet, CORS.
- Health Check: `GET /health`

### **WhatsApp Service**

- Dependency: Chromium (for Puppeteer)
- Auth Persistence: Local folder `.wwebjs_auth` (MUST be persistent volume).
- Port: 5005

---

## **4\. API Integration Summary**

- **Authentication**: JWT Bearer tokens in `Authorization` header.
- **Envelope**: All responses wrapped in `{ success, data, error?, code? }`.
- **Key Modules**:
    - `/products`: Inventory management.
    - `/store`: Public customer-facing storefront API.
    - `/whatsapp`: Status, QR, and messaging control.
    - `/billing`: SaaS subscription management.

---

## **5\. Database Configuration**

- **Type**: PostgreSQL (managed via Supabase).
- **Schema**: Organizations (Multitenant), Users, Products, Transactions, Invoices, Razorpay Keys (Encrypted).
- **Encryption**: AES-256-GCM used for storing tenant secrets.

---

## **6\. Ports & Networking**

| **Port** | **Purpose** |
| --- | --- |
| 5000 | Main Backend API |
| 5005 | WhatsApp Microservice |
| 3000 | Frontend (Marketing / INV) |
| 5173 | Admin Frontend |

---

## **7\. Cloud Deployment Plan (AWS Recommendation)**

1.  **ECS Fargate**: Container orchestration for Backend and WhatsApp services.
2.  **S3/CloudFront**: Hosting for the 3 Frontend build folders.
3.  **EFS**: Persistent storage for WhatsApp `.wwebjs_auth` sessions.
4.  **Supabase**: Managed Postgres.
5.  **Secrets Manager**: Storing `JWT_SECRET` and `RAZORPAY_ENCRYPTION_KEY`.