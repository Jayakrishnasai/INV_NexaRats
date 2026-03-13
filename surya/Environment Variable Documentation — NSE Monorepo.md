# Environment Variable Documentation — NSE Monorepo

## **1\. Inventory Backend (**

**/NexaratsINV/NexaratsINV/backend/.env****)**

### **Server & Network**

- `PORT`: Default `5000`.
- `NODE_ENV`: `production` or `development`.
- `CORS_ORIGIN`: Canonical URL of the frontend (e.g., `https://app.nexarats.com`).
- `FRONTEND_URL`: Used for SaaS redirect callbacks.

### **Database (Supabase)**

- `SUPABASE_URL`: Your Supabase project URL.
- `SUPABASE_ANON_KEY`: Public anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: **SECRET** Service role key (bypasses RLS).

### **Security & Auth**

- `JWT_SECRET`: 256-bit random string for access tokens.
- `JWT_REFRESH_SECRET`: Separate secret for refresh tokens.
- `RAZORPAY_ENCRYPTION_KEY`: **CRITICAL** 64-char hex string used to encrypt tenant API secrets at rest.

### **Integrations**

- `WA_API_KEY`: Auth key shared with the WhatsApp microservice.
- `RAZORPAY_KEY_ID`: (Optional) Platform-level Razorpay key.
- `RAZORPAY_KEY_SECRET`: (Optional) Platform-level Razorpay secret.

---

## **2\. WhatsApp Service (**`/NexaratsINV/NexaratsINV/whatsapp/.env`**)**

- `WA_API_KEY`: Must match the Backend's `WA_API_KEY`.
- `PORT`: Default `5005`.

---

## **3\. Frontends (**

**.env****)**

_Required for Inventory UI, Admin Panel, and Marketing._

- `VITE_API_BASE_URL`: Pointer to the Backend API (e.g., `https://api.nexarats.com/api/v1`).
- `VITE_WHATSAPP_API_URL`: Pointer to the WhatsApp service (e.g., `https://wa.nexarats.com/api/whatsapp`).
- `VITE_USE_MOCKS`: Set to `false` for real API connectivity.
- `VITE_WA_API_KEY`: Public key for WhatsApp service authorization.