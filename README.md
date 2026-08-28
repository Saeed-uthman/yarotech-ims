# Al-Amaan Pharmacy Management & Financial Accountability System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Backend](https://img.shields.io/badge/Backend-Django_REST_Framework-092e20.svg)](https://www.djangoproject.com/)
[![Database](https://img.shields.io/badge/Database-PostgreSQL_Production-4169E1.svg)](https://www.postgresql.org/)

**Al-Amaan Pharmacy Management & Financial Accountability System** is a streamlined, resilient, and audit-transparent pharmaceutical retail operations and business accountability platform. It is engineered specifically for pharmaceutical retailing, multi-manufacturer variant tracking, customer credit management, atomic inventory control, stock replenishment, and verifiable financial cashbook accounting.

---

## 📑 Table of Contents

1. [Executive Summary & Core Philosophy](#-executive-summary--core-philosophy)
2. [Key System Modules](#-key-system-modules)
3. [Architecture Overview & One Source of Truth (OSOT)](#-architecture-overview--one-source-of-truth-osot)
4. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
5. [Dual-Tier Pricing & Historical Price Integrity](#-dual-tier-pricing--historical-price-integrity)
6. [Tech Stack](#-tech-stack)
7. [Folder Structure](#-folder-structure)
8. [Installation & Setup](#-installation--setup)
9. [Available Scripts](#-available-scripts)
10. [Django REST Framework Backend](#-django-rest-framework-backend-blueprint)
11. [License & Proprietary Notice](#-license--proprietary-notice)

---

## 🏥 Executive Summary & Core Philosophy

In a high-turnover pharmaceutical retail environment, operational accuracy and financial transparency are paramount. The Al-Amaan Pharmacy platform replaces ad-hoc spreadsheets and fragmented POS terminals with an integrated, single-source-of-truth application.

### Key Architectural Tenets:
- **One Source of Truth (OSOT)**: Each business domain is owned by exactly one module (e.g. Products owns the catalogue, Inventory owns stock quantities, Accountability owns financial movements).
- **Simple, Practical Scope**: Built specifically for retail dispensing, inventory, and cashbook accountability without ERP bloat (no unnecessary supplier CRM, batch-expiry routing, or clinical AI).
- **Historical Price Immutability**: All sales transactions capture permanent price and cost snapshots at transaction time—preventing historical profit distortion when retail or wholesale prices change.
- **Strict Role-Based Privacy**: Sensitive wholesale base procurement costs and profit margins are strictly redacted from Cashier accounts and visible only to Administrators.
- **Traceable Financial Accountability**: Every cash inflow (`IN`) and outflow (`OUT`) is tracked in a centralized financial cashbook.

---

## ✨ Key System Modules

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       AL-AMAAN PHARMACY MODULES                             │
├───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│ 1. Authentication │ 2. Product Catalog│ 3. Inventory      │ 4. Customers    │
│    & User Access  │    & Variants     │    & Movements    │    & Debt       │
├───────────────────┼───────────────────┼───────────────────┼─────────────────┤
│ 5. Sales & POS    │ 6. Customer Debt  │ 7. Stock Purchases│ 8. Central      │
│    Checkout       │    & Settlements  │    & Restocking   │    Accountability│
├───────────────────┼───────────────────┼───────────────────┼─────────────────┤
│ 9. Financial & BI │ 10. System        │ 11. Executive     │                 │
│    Reports        │     Settings      │     Dashboard     │                 │
└───────────────────┴───────────────────┴───────────────────┴─────────────────┘
```

### 1. Authentication & Staff Access Control (`/src/components/auth/` & `/src/components/users/`)
- **Staff Registration & Admin Approval Workflow**: New staff members register with `PENDING` status.
- **Admin Review**: Administrators can `APPROVE`, `REJECT` (with reason), `SUSPEND`, or `REACTIVATE` user accounts.
- **Role Hierarchy**: Two distinct roles: `ADMIN` and `CASHIER`.
- **Session Security**: JWT-ready authentication structure with role-aware navigation guards.

### 2. Product Master Catalog & Company Variants (`/src/components/products/`)
- **Two-Tier Hierarchical Model**:
  - **Product Master**: Generic formulation, dosage form, strength, therapeutic category, and prescription flag (POM/OTC).
  - **Company Variants**: Manufacturer-specific SKU (e.g. DANA, EMZOR, GSK, FIDSON), wholesale base price, retail selling price, reorder level, and stock quantity.
- **Multi-Step Product Wizard**: Guided workflow for adding products, configuring manufacturer variants, setting prices, and assigning initial stock.
- **Price Adjustment Audit**: Full history of price changes, capturing reasons, timestamps, and authorized staff.

### 3. Inventory Tracking & Movement Ledger (`/src/components/inventory/`)
- **Real-Time Stock Balances**: Live visibility of stock levels across all product-company variants.
- **Stock Movement Ledger**: Immutable audit log of every stock alteration (`PURCHASE`, `SALE`, `MANUAL_ADJUSTMENT`).
- **Inventory Valuation**: Accurate valuation calculated as `Current Stock × Base Price` (Wholesale Cost).
- **Safety Alerts**: Filterable views for *In Stock*, *Low Stock* ($\le \text{reorder level}$), and *Out of Stock*.

### 4. Customer Directory & Debt Management (`/src/components/customers/`)
- **Registered Customer Accounts**: Persistent customer profiles with contact info, transaction history, and total credit balance.
- **Anonymous Walk-In Support ("Walking Customer")**: Walk-in sales are executed without creating dummy database rows (`Sale.customer = NULL`).
- **Debt Recovery & Settlement**: Supports partial payments, balance tracking, and auto-allocation across outstanding sales.

### 5. Sales & Point of Sale (POS) (`/src/components/sales/`)
- **Streamlined Checkout**: Rapid product/variant search, live price display, and dynamic cart management.
- **Multi-Method Tender**: Cash, Bank Transfer, POS/Card, and Credit.
- **Split & Partial Payments**: Automatically generates outstanding debt balances when sales are partially paid.
- **Receipt Generation**: Printable and shareable sales receipts with business branding and cashier details.

### 6. Stock Purchases & Procurement Restocking (`/src/components/purchases/`)
- **Inbound Restock Invoices**: Record multi-item stock purchases directly into inventory.
- **Single-Action Synchronization**: Restocking simultaneously increments product stock, logs stock movement records, and registers cash outflow (`OUT`) in the financial ledger.

### 7. Financial Accountability & Cashbook Ledger (`/src/components/accountability/`)
- **Centralized General Cashbook**: Unified transaction feed tracking every monetary inflow (`IN`) and outflow (`OUT`).
- **Automated Entry Logging**: Sales, debt payments, and stock purchases automatically post entries.
- **Manual Operational Expenses**: Log routine pharmacy expenses (Generator Fuel, Utilities, Transport, Stationery) with category tagging and notes.
- **Reconciliation Metrics**: Live calculations of Total Money In, Total Money Out, and Net Cash Movement.

### 8. Financial, Sales & Movement Reports (`/src/components/reports/`)
- **Read-Only Business Intelligence**: Aggregates operational data across customizable date filters (*Today*, *This Week*, *This Month*, *Custom Range*, *Overall*).
- **Dedicated Report Tabs**:
  - Sales Summary & Volume
  - Gross Profit & Margins
  - Inventory Valuation & Movement Audits
  - Stock Purchases Breakdown
  - Customer Debt Outstanding
  - Financial Cash Inflows vs. Outflows

### 9. Executive Dashboard (`/src/components/dashboard/`)
- **At-a-Glance Operational KPIs**: Today's Revenue, Today's Profit (Admin only), Transaction Count, Inventory Value, Low Stock Alerts, and Outstanding Debt.
- **Actionable Widgets**: Quick links to low-stock reorders, pending staff approvals, and high-volume product summaries.

### 10. System Preferences & Settings (`/src/components/settings/`)
- **Pharmacy Identity**: Name, phone, email, address, logo, and receipt footer text.
- **Operational Rules**: Currency symbol (₦ / NGN), low stock threshold defaults, and credit sales authorization toggles.

---

## 🏛 Architecture Overview & One Source of Truth (OSOT)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          ONE SOURCE OF TRUTH (OSOT)                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         ▼                             ▼                             ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│    accounts     │           │    products     │           │    customers    │
│  Users / Roles  │           │ Catalog / SKUs  │           │ Profiles / Debt │
└────────┬────────┘           └────────┬────────┘           └────────┬────────┘
         │                             │                             │
         │                             ▼                             │
         │                    ┌─────────────────┐                    │
         │                    │    inventory    │                    │
         │                    │ Stock Movements │                    │
         │                    └────────┬────────┘                    │
         │                             │                             │
         │            ┌────────────────┴────────────────┐            │
         ▼            ▼                                 ▼            ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│             sales             │             │           purchases           │
│   POS Orders & Sale Items     │             │     Restock Procurement       │
└───────────────┬───────────────┘             └───────────────┬───────────────┘
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       ▼
                        ┌───────────────────────────────┐
                        │        accountability         │
                        │ Central Money IN/OUT Cashbook │
                        └──────────────┬────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
         ┌─────────────────────────────┐┌─────────────────────────────┐
         │           reports           ││          dashboard          │
         │     Read-Only Analytics     ││     Executive KPI Views     │
         └─────────────────────────────┘└─────────────────────────────┘
```

---

## 🔐 Role-Based Access Control (RBAC)

| Feature / Action | Administrator (`ADMIN`) | Cashier / Dispenser (`CASHIER`) |
| :--- | :---: | :---: |
| **User Approvals & Account Suspension** | ✅ Full Access | ❌ Denied |
| **Product Master Creation & Editing** | ✅ Full Access | ❌ Denied |
| **Wholesale Base Cost & Profit Visibility** | ✅ Full Access | ❌ **Redacted / Hidden** |
| **Retail Selling Price & Stock Lookup** | ✅ Full Access | ✅ Allowed |
| **POS Sales & Dispensing** | ✅ Full Access | ✅ Allowed |
| **Reprint Receipts & Customer Search** | ✅ Full Access | ✅ Allowed |
| **Customer Debt Payment Recording** | ✅ Full Access | ✅ Allowed |
| **Stock Purchases / Restocking** | ✅ Full Access | ❌ Denied |
| **Manual Inventory Adjustments** | ✅ Full Access | ❌ Denied |
| **Financial Ledger & Expense Logging** | ✅ Full Access | ❌ Denied |
| **Financial & Profit Reports** | ✅ Full Access | ❌ Denied |
| **System Settings Configuration** | ✅ Full Access | ❌ Read-Only |

---

## 💰 Dual-Tier Pricing & Historical Price Integrity

1. **Wholesale Base Price (`base_price`)**: The cost price paid by the pharmacy per unit. Used exclusively for inventory valuation, profit calculation, and administrative audits.
2. **Retail Selling Price (`selling_price`)**: The dispensing price charged to customers at the POS.
3. **Historical Price Integrity**:
   - Every `SaleItem` records a permanent snapshot of `unit_selling_price` and `unit_base_price` at the moment of sale.
   - Subsequent price updates on a product variant **never** alter past sales records or historical profit reports.
   - Profit is calculated strictly as:
     $$\text{Profit} = (\text{Unit Selling Price} - \text{Unit Base Price}) \times \text{Quantity}$$

---

## 💻 Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Declarative component UI with modern hooks and state isolation |
| **Language** | **TypeScript 5.6** | Strict static typing, comprehensive domain interfaces, and enums |
| **Styling & Design System**| **Tailwind CSS v4** | Modern utility-first styling with responsive, accessible layouts |
| **Iconography** | **Lucide React** | Consistent, lightweight vector icons |
| **Transitions** | **Motion (`motion/react`)** | Fluid micro-interactions and layout transitions |
| **Current Data Layer** | **Django REST API** | Live JWT-authenticated API services with idempotent transaction workflows |
| **Backend** | **Django 5.x + DRF** | SQLite for local development and PostgreSQL for production |
| **Build Tooling** | **Vite 6** | Fast development server and production bundler |

---

## 📁 Folder Structure

```
src/
├── components/
│   ├── accountability/               # Financial cashbook & expense logging
│   ├── auth/                         # Staff login, registration, and approval notice
│   ├── common/                       # Shared UI components (Modals, Toasts, Badges)
│   ├── customers/                    # Customer records, debt balances, and payment history
│   ├── dashboard/                    # Executive KPI cards, trend charts, and alerts
│   ├── inventory/                    # Stock tracking, valuations, and movement ledger
│   ├── layout/                       # App layout, Sidebar, Header, and Navigation
│   ├── products/                     # Product catalog, multi-company variants, and wizard
│   ├── purchases/                    # Restock purchase orders and receiving
│   ├── reports/                      # Multi-tab financial and operational BI reports
│   ├── sales/                        # POS dispensing cart, checkout, and receipts
│   ├── settings/                     # Pharmacy identity, rules, and preferences
│   └── users/                        # Staff user management and admin approval console
├── contexts/                         # React context providers
├── data/                             # Static application defaults
├── hooks/                            # Custom React hooks (Auth, Dashboard, Shortcuts, etc.)
├── services/                         # Domain service layer (Product, Sales, Inventory, etc.)
├── utils/                            # Date, currency (₦/NGN), and number formatting helpers
├── types.ts                          # Comprehensive TypeScript domain interfaces & types
├── App.tsx                           # Root application component with view routing
└── main.tsx                          # React entry point
```

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-organization/al-amaan-pharmacy.git
   cd al-amaan-pharmacy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The application will be running at `http://localhost:3000`.

   On Windows, after the frontend and Django setup are complete, you can also
   double-click `Start Pharmacy System.cmd` to back up the local SQLite data,
   start both services, and open the application. See
   [`LOCAL_AND_DEPLOYMENT_GUIDE.md`](./LOCAL_AND_DEPLOYMENT_GUIDE.md) for the
   local database, restoration, PostgreSQL migration, and deployment plan.

---

## 📜 Available Scripts

| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts the Vite development server on port 3000. |
| `npm run build` | Compiles TypeScript and builds the production static assets in `dist/`. |
| `npm run preview` | Serves the production build locally for verification. |
| `npm run lint` | Runs TypeScript compiler checks (`tsc --noEmit`) to validate type safety. |
| `Start Pharmacy System.cmd` | Windows double-click launcher for the current local environment. |
| `Backup Pharmacy Data.cmd` | Creates a verified SQLite and uploaded-media backup. |

---

## 🔌 Django REST Framework Backend Blueprint

The Django blueprint is implemented as the live API under `alamaan_backend/`.
SQLite remains the local development database; PostgreSQL is the production
target and the required database for the final concurrency gate.

📄 **[`DJANGO_BACKEND_DEVELOPMENT_BLUEPRINT.md`](./DJANGO_BACKEND_DEVELOPMENT_BLUEPRINT.md)**

Additional operational references:

- **Deployment and PostgreSQL gate**: [`alamaan_backend/DEPLOYMENT.md`](./alamaan_backend/DEPLOYMENT.md)
- **End-to-end release acceptance**: [`RELEASE_ACCEPTANCE.md`](./RELEASE_ACCEPTANCE.md)

### Nigerian generic medicine starter catalogue

The backend includes an idempotent catalogue command with 132 generic medicine
records across 17 categories. The dataset is informed by Nigeria's Essential
Medicines Lists and is intended to reduce initial data entry; it is not a
substitute for verifying the exact commercial pack in the current
[NAFDAC Greenbook](https://greenbook.nafdac.gov.ng/).

From `alamaan_backend/`, preview the import without changing the database:

```powershell
python manage.py seed_nigerian_medicines --dry-run
```

Load the complete starter catalogue:

```powershell
python manage.py seed_nigerian_medicines
```

Useful optional forms include:

```powershell
python manage.py seed_nigerian_medicines --limit 10
python manage.py seed_nigerian_medicines --category "Antimalarial Medicines"
python manage.py seed_nigerian_medicines --admin-email owner@example.com
```

Running the command again is safe: matching generic name, strength, and dosage
form records are skipped. It deliberately creates no company/manufacturer
variant, price, barcode, NAFDAC registration number, or opening stock. After
importing, open a product in the admin UI and use **Add Variant** to attach the
verified manufacturer and actual purchase/retail data from the physical pack.

### Key Highlights of the Backend:
- **Project Structure**: Clean separation across Django apps (`accounts`, `products`, `inventory`, `customers`, `sales`, `purchases`, `accountability`, `reports`, `settings_app`, `dashboard`, `common`).
- **Database Schema**: Normalized PostgreSQL-ready models with explicit constraints, foreign keys, and check constraints (`current_stock >= 0`).
- **Pessimistic Concurrency**: Prevents race conditions and overselling using `select_for_update()` inside `transaction.atomic` blocks.
- **RESTful Endpoints (`/api/v1/`)**: Fully documented endpoints, serializers, permissions, and request/response contracts.
- **15-Phase Implementation Roadmap**: Step-by-step development sequence from project foundation to production deployment.

---

## 📄 License & Proprietary Notice

This software and its documentation are proprietary and confidential.  
© 2026 **Al-Amaan Pharmacy Management Systems**. All rights reserved.
