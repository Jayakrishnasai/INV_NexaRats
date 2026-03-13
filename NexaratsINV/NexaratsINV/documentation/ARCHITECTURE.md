# 🏗️ Nexarats Frontend Architecture

This document describes the structure and design patterns used in the Nexarats Frontend.

---

## 🛰️ Frontend Segments

The frontend application provides two distinct experiences:
1. **The Core POS (Desktop/Admin)**: Interface for inventory management, physical billing, vendor management, and internal business reports.
2. **The Online Store (Customer Facing)**: A premium web-portal where customers can browse inventory and manage their profiles.

---

## 🛠️ Technology Stack

- **Framework**: React 18 with Vite
- **Styling**: Vanilla CSS with a custom design system (glassmorphism, modern typography)
- **Icons**: Lucide React
- **Icons**: React Context & Hooks
- **Architecture**: Service-oriented architecture for API interactions.

---

## 📂 Folder Structure
```text
frontend/
├── src/
│   ├── components/   # Reusable UI elements
│   ├── pages/        # Main application views (Admin, Store, Login)
│   ├── services/     # API interaction logic (api.ts)
│   ├── context/      # Global state management
│   ├── types/        # TypeScript interfaces
│   └── styles/       # Global and component-specific CSS
└── public/           # Static assets
```

---

*Nexarats Engineering Team.*
