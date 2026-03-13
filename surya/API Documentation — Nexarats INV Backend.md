# API Documentation — Nexarats INV Backend

The Nexarats INV Backend serves as the central API for the Inventory Management system and the Online Storefront.

## **Base Configuration**

- **Base URL**: `/api/v1`
- **Auth Method**: JWT Bearer Token (`Authorization: Bearer <token>`)
- **Response Format**:
    
    ```
    json
    ```
    
    {"success": true,"data": { ... },"message": "Optional feedback"}

---

## **1\. Authentication**

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| POST | `/auth/login` | Admin/Staff login. Returns `{ user, token, refreshToken }`. |
| POST | `/auth/refresh` | Silent token renewal using `refreshToken`. |
| GET | `/auth/me` | Get current authenticated user details. |

## **2\. Inventory Management (Admin Only)**

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | `/products` | List all inventory products. |
| POST | `/products` | Create a new product (Zod validated). |
| PUT | `/products/:id` | Update product details. |
| DELETE | `/products/:id` | Soft/Hard delete product. |

## **3\. CRM & Sales**

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | `/customers` | List all registered customers. |
| POST | `/customers` | Register a new customer. |
| GET | `/vendors` | List all supply vendors. |
| POST | `/transactions` | Create a new sale transaction. |

## **4\. Online Storefront (Public API)**

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | `/store/products` | Public product list for storefront. |
| POST | `/store/auth/send-otp` | Request WhatsApp OTP for customer login. |
| POST | `/store/auth/verify-otp` | Verify OTP and create customer session. |

## **5\. WhatsApp & Invoices**

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | `/whatsapp/status` | Check if WhatsApp service is connected. |
| GET | `/whatsapp/qr` | Get base64 QR code for pairing. |
| POST | `/invoices/send-whatsapp` | Dispatch PDF/Text invoice via WhatsApp. |
| POST | `/invoices/download-pdf` | Generate and download PDF invoice. |

## **6\. Dashboard & SaaS Management**

| **Method** | **Endpoint** | **Description** |
| --- | --- | --- |
| GET | `/dashboard` | Daily sales and stock overview. |
| GET | `/analytics` | Historical trends and PDF reports. |
| PATCH | `/onboarding/step` | Advance tenant onboarding state. |
| POST | `/keys/razorpay` | Save encrypted payment gateway keys. |