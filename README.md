# Stitch Pharmacy — Products & Master Catalogue Module

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

Stitch Pharmacy is an enterprise-grade Pharmacy Management and Point of Sale (POS) application. This documentation focuses on the **Products Module (Master Catalogue)**, which serves as the single authoritative source of truth for all pharmaceutical formulations, dosage forms, manufacturer variants, barcodes, wholesale costs, and retail pricing throughout the entire ecosystem.

---

## 📑 Table of Contents

1. [Project Overview](#-project-overview)
2. [Key Features of the Products Module](#-key-features-of-the-products-module)
3. [Architecture Overview & Data Flow](#-architecture-overview--data-flow)
4. [Module Boundaries & "One Owner, Many Consumers"](#-module-boundaries--one-owner-many-consumers)
5. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
6. [Tech Stack](#-tech-stack)
7. [Installation & Setup](#-installation--setup)
8. [Available Scripts](#-available-scripts)
9. [API Readiness & Backend Integration](#-api-readiness--backend-integration)
10. [Folder Structure](#-folder-structure)

---

## 🏥 Project Overview

In a modern pharmaceutical retail environment, product management requires far more precision than standard e-commerce catalogues. A single active generic drug composition (e.g., *Paracetamol 500mg*) can exist across multiple pharmaceutical manufacturers (e.g., *Emzor*, *GlaxoSmithKline*, *M&B*), each having distinct:
- Base wholesale procurement costs
- Retail dispensing prices
- Packaging variations (Blister packs, bottles, strips)
- Specific manufacturer barcodes and SKU identifiers
- Individual stock levels and reorder safety thresholds

The **Stitch Pharmacy Products Module** establishes a structured, two-tier data model:
1. **Product Master Record**: Encapsulates clinical and regulatory attributes (Brand Name, Generic Formulation, Category, Dosage Form, Strength, Prescription Requirements).
2. **Manufacturer Variants**: Encapsulates commercial, logistics, and inventory attributes (Manufacturer/Company, Base Cost, Selling Price, Barcode, Reorder Level, and Current Physical Stock).

---

## ✨ Key Features of the Products Module

### 1. Two-Tier Hierarchical Drug Model
- **Clinical Attributes**: Distinguishes between commercial Brand Names and Generic Chemical Formulations (e.g., Brand: *Amoxil*, Generic: *Amoxicillin Trihydrate*).
- **Dosage Form & Strength Classification**: Standardized dosage forms (*Tablets*, *Capsules*, *Syrup*, *Suspension*, *Injections*, *Ointments*, *Drops*, *Inhalers*, *Suppositories*) with explicit strength metrics (*500mg*, *250mg/5ml*, *100IU*).
- **Regulatory & Prescription Control**: Explicit flags for Prescription-Only Medications (POM), Over-The-Counter (OTC) drugs, and Controlled Substances.

### 2. Multi-Manufacturer Variant & SKU Management
- Maintain multiple manufacturer variants under a single product entry.
- Unique barcode and SKU tracking per variant to support automated optical scanning at POS.
- Independent pricing models per variant: Base Wholesale Cost, Suggested Retail Price, and Target Profit Margin percentage.
- Configurable low-stock reorder thresholds.

### 3. Guided Multi-Step Product Wizard (`ProductWizard.tsx`)
- **Step 1: General Product Information**: Name, generic classification, category assignment, dosage form, strength, description, and prescription requirement.
- **Step 2: Manufacturer Variants & Pricing**: Interactive variant builder with live profit margin calculation, base cost entry, retail price setup, and barcode generation.
- **Step 3: Initial Stock & Confirmation**: Setup opening stock quantities with automated inventory movement logging.

### 4. Advanced Search, Filtering & View Modes
- Instant search across Brand Name, Generic Composition, Category, and Manufacturer.
- Filter by Stock Status (*All*, *In Stock*, *Low Stock*, *Out of Stock*), Category, and Prescription requirements.
- Dual-view toggle: High-density Data Table (`ProductListTable.tsx`) with variant rollups or visual Product Cards (`ProductCard.tsx`).
- Responsive Mobile List view with touch-optimized variant accordions.

### 5. Product & Variant Lifecycle Management
- **In-depth Product Details View (`ProductDetailsView.tsx`)**: Deep-dive into product clinical information, manufacturer variants, linked active inventory counts, and price histories.
- **Safe Soft Deactivation (`ConfirmDeactivationModal.tsx`)**: Prevent catastrophic cascade deletion by deactivating obsolete or discontinued products while maintaining historical sales and purchase audit records.

---

## 🏛 Architecture Overview & Data Flow

The Stitch Pharmacy system enforces a strict unidirectional data flow and an **Authoritative "One Owner, Many Consumers"** model:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHORITATIVE DATA OWNER                           │
│                                                                             │
│                        [ PRODUCTS MASTER MODULE ]                           │
│     • Product Metadata (Name, Generic, Category, Form, Strength, POM)       │
│     • Manufacturer Variants (Base Cost, Selling Price, SKU, Barcode)        │
│     • Active / Inactive Status                                              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                Consumes Catalog Data  │  (Read-Only / Entity Reference)
                                       ▼
 ┌───────────────────────────────────────────────────────────────────────────┐
 │                            CONSUMER MODULES                               │
 │                                                                           │
 │  ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────┐  │
 │  │   INVENTORY MODULE    │  │   SALES / POS MODULE  │  │   PURCHASES   │  │
 │  │ • Tracks physical qty │  │ • Scans variant barcodes│ │ • Procurement │  │
 │  │ • Logs stock audits   │  │ • Billed at variant    │  │   restocking  │  │
 │  │ • Owns adjustments    │  │   selling price        │  │ • Updates     │  │
 │  │                       │  │ • Decrements variant   │  │   base costs  │  │
 │  │                       │  │   stock on checkout    │  │   on invoice  │  │
 │  └───────────────────────┘  └───────────────────────┘  └───────────────┘  │
 └───────────────────────────────────────────────────────────────────────────┘
```

### Data Flow Lifecycle Example:
1. **Creation**: An administrator creates *Augmentin 625mg* in the **Products Module** with an *GSK* variant (Base Cost: ₦3,500, Selling Price: ₦4,500, Barcode: `5012345678901`).
2. **Procurement**: The **Purchases Module** logs an invoice from a distributor, increasing the GSK variant's physical stock count.
3. **Audit**: The **Inventory Module** monitors the aggregated stock count across all variants, triggering low-stock alerts when stock drops below the threshold set in the variant.
4. **Dispensation**: At the **Sales (POS) Module**, the cashier scans the barcode `5012345678901`. The POS pulls the active selling price from the variant, completes the sale, and triggers a stock decrement event.

---

## 🛡 Module Boundaries & "One Owner, Many Consumers"

To eliminate state duplication and prevent database inconsistencies, strict architectural boundaries are enforced:

| Domain Concern | Authoritative Owner | Consumer Modules | Boundary Rule |
| :--- | :--- | :--- | :--- |
| **Product Metadata & Variants** | **Products Module** | Inventory, Sales, Purchases, Reports, Dashboard | Only Products Module can create, update, or deactivate products and variant pricing structures. |
| **Stock Quantities & Adjustments** | **Inventory Module** | Products, Sales, Purchases, Dashboard | Stock counts are adjusted in Inventory or mutated via verified transactions (Sales/Purchases). Products module displays stock as a derived read-only metric. |
| **Transaction Execution** | **Sales / POS Module** | Dashboard, Accountability, Reports | Sales snapshots the variant selling price at the exact moment of sale. |
| **Supplier Procurement** | **Purchases Module** | Inventory, Accountability | Restock purchases link to existing product variants, updating variant base cost upon invoice approval. |

---

## 🔐 Role-Based Access Control (RBAC)

The application features role-based access control with granular permission checks across all product operations:

```
                  ┌─────────────────────────────────────┐
                  │      ACTIVE USER ROLE CONTEXT       │
                  └──────────┬────────────────┬─────────┘
                             │                │
             ┌───────────────┴────┐      ┌────┴───────────────┐
             │     ADMIN ROLE     │      │   CASHIER / STAFF  │
             └───────────────┬────┘      └────┬───────────────┘
                             │                │
 ┌───────────────────────────┴───┐ ┌──────────┴──────────────────────────┐
 │  FULL CATALOGUE & FINANCIALS  │ │       OPERATIONAL DISPENSING        │
 │ • Create / Edit Products      │ │ • Search Products & Check Stock     │
 │ • Configure Base Costs        │ │ • View Public Selling Prices        │
 │ • View Gross Profit Margins   │ │ • Scan Variant Barcodes at POS      │
 │ • Deactivate Products         │ │ ❌ Base Wholesale Costs Hidden      │
 │ • Manage Categories & Brands  │ │ ❌ Profit Margins Redacted          │
 │                               │ │ ❌ Cannot Modify Product Pricing    │
 └───────────────────────────────┘ └─────────────────────────────────────┘
```

- **Admin Role**:
  - Full permissions to create, edit, deactivate, and configure products and manufacturer variants.
  - Full visibility into **Wholesale Base Costs**, **Markup Percentages**, and **Gross Profit Margins**.
  - Access to bulk price updates and category/company management.
- **Cashier / Staff Role**:
  - Operational catalogue access: search products, verify active stock levels, scan barcodes at checkout.
  - Sensitive financial metrics (Wholesale Base Cost, Profit Margins) are redacted from the UI.
  - Price editing and product deactivation controls are disabled.

---

## 💻 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **React 19** | Declarative component UI with modern hooks and state isolation |
| **Language** | **TypeScript 5.6** | Strict static typing, comprehensive domain interfaces, and enums |
| **Styling & Design System** | **Tailwind CSS v4** | Modern utility-first styling, responsive fluid layouts, and accessible contrast |
| **Icons** | **Lucide React** | Consistent, lightweight vector iconography |
| **Motion & Micro-interactions** | **Motion (`motion/react`)** | Fluid transitions, modal drawer animations, and layout physics |
| **Service & Mock Engine** | **Async Service Layer** | Normalized in-memory reactive repository with event broadcasting |
| **Build Tooling** | **Vite 6** | Ultra-fast HMR and production bundling |

---

## ⚙️ Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm (v9+) or yarn (v1.22+)

### Step-by-Step Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-organization/stitch-pharmacy.git
   cd stitch-pharmacy
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment configuration:
   ```bash
   cp .env.example .env
   ```

4. **Launch the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Boots the Vite development server on `http://0.0.0.0:3000`. |
| `npm run build` | Compiles TypeScript and executes production build outputting to `/dist`. |
| `npm run preview` | Spins up a local static server to preview the `/dist` production build. |
| `npm run lint` | Executes TypeScript type-checking (`tsc --noEmit`) across the entire codebase. |

---

## 🔌 API Readiness & Backend Integration

The Products Module is architected with a clean separation of concerns. All UI components interact exclusively with the service layer (`/src/services/productService.ts` and `/src/services/productVariantService.ts`), ensuring seamless drop-in integration with RESTful or GraphQL backends (e.g., Django REST Framework, FastAPI, NestJS, Express).

### Product Entity Interface (`src/types.ts`)
```typescript
export interface Product {
  id: string;
  name: string;                   // e.g. "Amoxil"
  genericName: string;            // e.g. "Amoxicillin Trihydrate"
  categoryId: string;             // References Category Entity
  dosageForm: DosageForm;         // TABLET, CAPSULE, SYRUP, INJECTION, etc.
  strength: string;               // e.g. "500mg"
  prescriptionRequired: boolean;  // POM Flag
  description?: string;
  isActive: boolean;              // Soft delete status
  variants?: ProductVariant[];    // Embedded or linked manufacturer variants
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  companyId: string;              // Manufacturer (e.g. "Emzor", "GSK")
  sku: string;                    // Stock Keeping Unit
  barcode?: string;               // Scannable UPC/EAN Code
  baseCost: number;               // Wholesale Procurement Cost (₦)
  sellingPrice: number;           // Retail Dispensing Price (₦)
  minReorderLevel: number;        // Low stock trigger threshold
  currentStock: number;           // Physical quantity available
  isActive: boolean;
}
```

### Connecting to a Live Backend API:
To connect the Products Module to a live backend endpoint:
1. Update `productService.ts` to call your REST endpoints:
   - `GET /api/v1/products/` — Retrieve paginated product list with search and filter query parameters.
   - `POST /api/v1/products/` — Create a new master product and its associated variants.
   - `GET /api/v1/products/:id/` — Retrieve comprehensive product detail with historical price logs.
   - `PUT /api/v1/products/:id/` — Update product clinical and regulatory details.
   - `PATCH /api/v1/products/:id/deactivate/` — Soft-deactivate a product.
   - `POST /api/v1/products/:id/variants/` — Add a new manufacturer variant.
2. Update `.env` with `VITE_API_BASE_URL=https://api.yourpharmacy.com/api/v1`.

---

## 📁 Folder Structure

```
src/
├── components/
│   ├── products/                     # Products & Catalogue Module Components
│   │   ├── ConfirmDeactivationModal.tsx # Soft-deactivation confirmation modal
│   │   ├── MetricCards.tsx             # Catalogue KPI widgets (Total, Low Stock, etc.)
│   │   ├── PriceDisplay.tsx            # Role-aware price & margin component
│   │   ├── ProductCard.tsx             # Grid card view component
│   │   ├── ProductDetailsView.tsx      # Comprehensive product & variant deep dive
│   │   ├── ProductEmptyState.tsx       # Zero-results & empty catalogue view
│   │   ├── ProductFilters.tsx          # Search bar, category, and stock filters
│   │   ├── ProductImage.tsx            # Fallback & dosage-aware drug visualizer
│   │   ├── ProductListMobile.tsx       # Touch-optimized mobile list view
│   │   ├── ProductListTable.tsx        # High-density desktop data table
│   │   ├── ProductStatusBadge.tsx      # Active / Inactive status pills
│   │   ├── ProductWizard.tsx           # Multi-step creation & pricing wizard
│   │   └── StockStatusBadge.tsx        # In Stock / Low / Out of stock indicator
│   ├── common/                         # Shared UI primitives (Toast, Scanner, etc.)
│   ├── inventory/                      # Stock auditing & movement logs
│   ├── sales/                          # Point of Sale (POS) checkout & receipts
│   ├── purchases/                      # Restock procurement orders
│   ├── customers/                      # Customer debt & profile ledgers
│   ├── accountability/                 # Central financial cashbook (Money IN/OUT)
│   ├── reports/                        # Analytics & CSV export views
│   └── settings/                       # Pharmacy identity & global rules
├── data/
│   ├── mock/                           # Normalized mock seeds (categories, products, etc.)
│   └── mockData.ts                     # Mock bundle export
├── services/
│   ├── productService.ts               # Product domain service
│   ├── productVariantService.ts        # Variant domain service
│   ├── mockRepository.ts               # In-memory reactive data layer
│   └── ...
├── utils/
│   └── formatters.ts                   # Currency (₦/NGN), Date, and Metric formatters
├── types.ts                            # Core TypeScript types, interfaces & enums
├── App.tsx                             # Main Router & Role Context Provider
└── main.tsx                            # React 19 Entrypoint
```

---

## 📄 License & Distribution

This software is proprietary and confidential. Unauthorized copying, distribution, or modification of this codebase, via any medium, is strictly prohibited.

**Stitch Pharmacy Management Systems** © 2026. All rights reserved.
