# 🎨 Nexarats Frontend Documentation (Modern Storefront)

The Nexarats Frontend is a high-performance, mobile-responsive React application providing a premium "JioMart/BigBasket" style shopping experience.

---

## 🏗️ Technology Stack
- **Library:** React 18
- **Build Tool:** Vite
- **Styling:** Vanilla CSS + Lucide Icons (Premium Design System)
- **State Management:** React Hooks (useState, useMemo, useEffect)
- **API Communication:** Fetch API with centralized `api.ts` services

---

## 📂 Architecture Overview

### 1. StorefrontPage (`StorefrontPage.tsx`)
This is the **Main Controller** for the online store.
- **Responsibility:** Manages all heavy state — Authentication, Loading Products, Fetching Orders, and Address Management.
- **Logic:** It encapsulates the business rules and passes clean data/handlers down to the UI components.

### 2. Storefront Main UI (`Storefront.tsx`)
The **Presentational Layer**.
- **Tabs System:** Handles navigation between `Shop`, `My Account`, `Order History`, and `Saved Addresses`.
- **Cart Engine:** Manages a local shopping cart state, calculates totals, GST, and delivery logic.
- **Checkout Modal**: A streamlined multi-step process for selecting addresses and payment methods.

### 3. Admin Dashboard Integration (`OnlineStore.tsx`)
The **Control Center** located inside the main POS application.
- **Real-time Stats:** Visualizes online sales, total orders, and total registered users.
- **User Management**: A dedicated view to see all customers who have logged in via WhatsApp.
- **Store Controls**: Toggle the store status (Online/Offline) and configure store-wide settings like `Minimum Order Value`.

---

## ✨ Key Features

### 🧼 Premium UX Design
- **Category Bar**: Horizontal scrollable categories with semantic icons.
- **Product Cards**: High-integrity design showing discounts, stock availability, and quick "Add to Cart" buttons.
- **Cart Drawer**: Side-sliding drawer for instant cart updates without leaving the page.

### 📱 WhatsApp First Login
- Customers log in using only their mobile number.
- No passwords to remember.
- Automatic profile creation upon first OTP verification.

### 📍 Intelligent Address System
- Allows users to save multiple addresses (Home, Work, Other).
- Automatic "Default" address selection during checkout.
- Persistent storage for a friction-less return shopping experience.

---

## 🛠️ State Persistence
- **LocalStorage**: Used to store `sessionToken` (nx_store_session) and `storeSettings`.
- **MongoDB Sync**: All user details (Name, Email, Addresses) are synced to the database so they are available across different browsers/devices.

---

## 🚀 Development Mode
1. `cd frontend`
2. `npm install`
3. `npm run dev`
4. Access at `http://localhost:3300` (or the port defined in Vite config).
