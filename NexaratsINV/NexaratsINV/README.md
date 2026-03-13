# 🛒 Nexarats Inventory & Online Store

**NexaratsINV** is an all-in-one Smart Inventory Management and Online Storefront system. It bridges the gap between traditional retail operations (POS) and modern e-commerce by providing a unified platform for inventory, billing, and customer-facing digital sales.

---

## ✨ Key Features

### 🏢 Smart POS (Point of Sale) UI
- **Inventory Management**: Real-time stock tracking, product categorization, and barcode support.
- **Dynamic Billing**: Fast checkout systems with premium design.
- **Vendor/Customer Management**: Track balances, transaction history, and contact details.
- **Reports**: Daily sales, profit analysis, and expense tracking visualizations.

### 🌐 Premium Online Storefront
- **JioMart/BigBasket UI**: High-end, mobile-responsive shopping experience.
- **Persistent Profiles**: Saved addresses, order history, and account stats.
- **Modern UX**: Smooth transitions, glassmorphism, and interactive elements.


---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18, Vite, Lucide Icons |
| **Styling** | Vanilla CSS (Premium Design System) |
| **State** | React Context/Hooks |


---

## 📂 Project Structure

```text
NexaratsINV/
├── frontend/             # Desktop POS & Online Storefront (React)
├── backend/              # Node.js API (Supabase, JWT, Redis)
├── whatsapp/             # Node.js WhatsApp Microservice
├── documentation/        # Detailed technical guides
├── tests/                # Playwright E2E Tests
└── README.md             # This file
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **Supabase Account** (for Backend database)
- **Redis Server** (optional, for Rate Limiting)

### 2. Setup and Run
To start the **entire stack** (Frontend + Backend):
```bash
npm run dev
```

To start individuals services:
- **Frontend only:** `npm run dev:frontend`
- **Backend only:** `npm run dev:backend`
- **WhatsApp Service:** `cd whatsapp && npm start`

---

## 📖 Documentation Index

For detailed guides, please refer to the **[`documentation/`](./documentation/README.md)** folder:

1.  **[Architecture Overview](./documentation/ARCHITECTURE.md)**: How the frontend system is structured.
2.  **[Frontend Architecture](./documentation/FRONTEND.md)**: Components, State, and UX.

---

## 🤝 Support
For any technical issues or feature requests, contact the development lead.

*Nexarats — Elevating Retail Experience.*

