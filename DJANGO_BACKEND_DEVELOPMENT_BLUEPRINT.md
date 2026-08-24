# Official Django REST Framework Backend Development Blueprint
**Project:** Al-Amaan Pharmacy Management & Financial Accountability System  
**Document Type:** Technical Architecture Specification, API Design Contract & Implementation Roadmap  
**Target Backend Stack:** Python 3.11+ / Django 5.x / Django REST Framework (DRF) / MySQL 8.x / djangorestframework-simplejwt  
**Target Frontend Stack:** React 18+ / TypeScript / Vite / Tailwind CSS  
**Target Author:** Senior Software Architect & Lead Django Engineer  
**Status:** Approved for Implementation Roadmap (Authoritative Blueprint)

---

## Table of Contents
1. [Executive Summary & Architectural Charter](#1-executive-summary--architectural-charter)
2. [Approved Business Scope & Out-of-Scope Boundary](#2-approved-business-scope--out-of-scope-boundary)
3. [Core Architectural Principles & Domain Boundaries](#3-core-architectural-principles--domain-boundaries)
4. [Django Project Architecture & App Modularization](#4-django-project-architecture--app-modularization)
5. [Detailed Database Schema & Model Design](#5-detailed-database-schema--model-design)
6. [Serializer Architecture & Data Transfer Objects (DTOs)](#6-serializer-architecture--data-transfer-objects-dtos)
7. [Service Layer & Business Transaction Boundaries](#7-service-layer--business-transaction-boundaries)
8. [Concurrency Control, Race Prevention & Idempotency](#8-concurrency-control-race-prevention--idempotency)
9. [Role-Based Access Control (RBAC) & Security Architecture](#9-role-based-access-control-rbac--security-architecture)
10. [Query / Selector Layer & Performance Optimization](#10-query--selector-layer--performance-optimization)
11. [Signals Evaluation & Architectural Constraints](#11-signals-evaluation--architectural-constraints)
12. [Media & Product Image Storage Strategy](#12-media--product-image-storage-strategy)
13. [Complete RESTful API Endpoint Specification (`/api/v1/`)](#13-complete-restful-api-endpoint-specification-apiv1)
14. [HTTP Status Codes, Error Handling & API Response Envelope](#14-http-status-codes-error-handling--api-response-envelope)
15. [Frontend-to-Backend Contract Mapping](#15-frontend-to-backend-contract-mapping)
16. [Frontend Redundancy Audit & Consolidation Directives](#16-frontend-redundancy-audit--consolidation-directives)
17. [Comprehensive Testing Strategy & Test Scenarios](#17-comprehensive-testing-strategy--test-scenarios)
18. [Environment Configuration & Production Readiness Checklist](#18-environment-configuration--production-readiness-checklist)
19. [Phase-by-Phase Backend Implementation Roadmap](#19-phase-by-phase-backend-implementation-roadmap)
20. [Final Architecture Summary & Risk Mitigation Matrix](#20-final-architecture-summary--risk-mitigation-matrix)

---

## 1. Executive Summary & Architectural Charter

The Al-Amaan Pharmacy Management System is a streamlined, resilient, and audit-transparent business operations and financial accountability platform. The system is designed specifically for pharmaceutical retailing, customer credit management, inventory tracking across manufacturers, stock replenishment, and verifiable financial accountability.

### 1.1 Purpose of this Document
This document establishes the **authoritative technical blueprint** for developing the Django REST Framework backend. It translates the validated React frontend requirements, mock schemas, and operational workflows into a secure, normalized, high-performance Django/MySQL architecture.

### 1.2 Non-Implementation Mandate
> **IMPORTANT FOR DEVELOPER / AGENT EXECUTION:**  
> This document is an architectural blueprint. It defines *what* must be constructed, *why* domain rules exist, *how* database constraints and services must behave, and *which* API contracts must be exposed. No code files are to be generated alongside this specification.

---

## 2. Approved Business Scope & Out-of-Scope Boundary

### 2.1 Approved In-Scope Business Domains
1. **User Authentication & Staff Access Control:** Role-based registration with manual Admin approval workflow, JWT tokens, account suspension/reactivation.
2. **Product Catalog:** Categories, dosage forms, manufacturer brands (companies), product-to-company variants, and product images.
3. **Controlled Selling-Price Range Architecture (4-Tier Pricing Model):** Wholesale base cost (restricted to Admin for inventory valuation and profit accountability) alongside a controlled selling-price range per Product + Company variant (`min_selling_price`, `default_selling_price`, `max_selling_price`), with complete price adjustment audit history.
4. **Inventory & Stock Movements:** Multi-variant inventory levels, threshold alerts, auditable stock ledger (purchases, sales, manual adjustments).
5. **Customer Management & 90-Day Inactivity Rules:** Registered customer database with live credit/debt tracking, alongside anonymous Walk-in ("Walking Customer") support. Automatic 90-day (3-month) inactivity evaluation to distinguish active and dormant customer accounts. Granular permissions where Cashiers register customers and take payments, while account editing and status changes are Admin-controlled.
6. **Sales & Point of Sale (POS):** Multi-item cart checkout, immediate stock deduction, cash/transfer/POS/credit splits, transaction-time price snapshotting.
7. **Customer Debt & Credit Recovery:** Partial payments, debt settlement records, receipt generation, and customer account ledger updates.
8. **Stock Purchasing & Restocking:** Multi-item purchase orders that simultaneously increment stock, record unit purchase costs, and post financial disbursements (Admin restricted).
9. **Financial Accountability (Cashbook / General Ledger):** Centralized ledger recording all cash inflows (`IN`) and outflows (`OUT`), operational expense tracking, and cash reconciliation (Admin restricted).
10. **Business Intelligence & Reporting:** Read-only aggregate endpoints for sales, profit, inventory movements, purchases, customer debt, and financial flows (Admin restricted).
11. **System Preferences & Global Settings:** Singleton settings for pharmacy identity, receipt formats, POS rules, and inventory thresholds (Admin restricted).
12. **Role-Aware Dashboard:** High-level operational summary KPIs for Cashiers (checkouts, dispensed units, active debtors, stock health) and executive financial KPIs for Administrators (margins, gross profit, inventory valuation, cashflow).

### 2.2 Explicitly Out-of-Scope (Strictly Forbidden)
To prevent architectural bloat and maintain the "Simple & Practical" charter, the backend **MUST NOT** implement:
- **Suppliers / Vendor Relationship Management:** Stock purchases are tracked by manufacturer/brand variant and internal purchase order, not external supplier CRM.
- **Batch / Lot Management & Expiry Tracking:** Stock is tracked at the Product-Company variant unit level. No batch tables, lot expiration schedules, or FEFO picking engines.
- **Clinical Workflows:** No prescription parsing, dosage titration, clinical diagnosis, patient medical records, or doctor registry.
- **Drug Interaction & Clinical Decision Support (CDSS):** No interaction checking databases or clinical contraindication algorithms.
- **Artificial Intelligence / Machine Learning:** No AI forecasting, predictive ordering, or LLM integrations.
- **Enterprise Features:** No payroll processing, multi-warehouse routing, multi-branch synchronization, purchase order RFQ workflows, or double-entry accrual accounting.

---

## 3. Core Architectural Principles & Domain Boundaries

### 3.1 One Source of Truth (OSOT)
Each business entity is strictly owned by one domain app:
```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    accounts     │       │    products     │       │    inventory    │
│  (Users/Auth)   │       │(Catalog/Variants│       │ (Stock/Movement)│
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    customers    │       │      sales      │       │    purchases    │
│(Profiles/Credit)│       │ (Orders/Items)  │       │(Restock Records)│
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   accountability    │
                        │ (Financial Ledger)  │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
         ┌─────────────────────┐       ┌─────────────────────┐
         │       reports       │       │      dashboard      │
         │(Read-Only Aggregates│       │(Executive Summary)  │
         └─────────────────────┘       └─────────────────────┘
```

### 3.2 Immutability of Historical Transactions
- **Never recalculate historical sales or profit using current product prices.** When a product's price changes, existing `SaleItem` records must remain untouched. `SaleItem` stores permanent snapshots of `selling_price` and `base_price` at the exact second the sale was finalized.
- **Financial movements and stock movements are append-only.** No physical `DELETE` or silent `UPDATE` is permitted on `AccountabilityTransaction` or `InventoryMovement`. Any operational reversal must be executed as an explicit compensating transaction.

### 3.3 Strict Separation of Read vs. Write Concerns
- **Writing Transactions:** Coordinated exclusively through atomic **Service Layer functions** (`services.py`).
- **Reading & Aggregating:** Performed using database-level SQL aggregations via **Selectors** (`selectors.py`) and Django ORM `annotate()`/`aggregate()`. Raw records are never loaded into Python memory for manual looping or math.

---

## 4. Django Project Architecture & App Modularization

### 4.1 Recommended Repository & Directory Layout
```
alamaan_backend/
├── manage.py
├── requirements/
│   ├── base.txt
│   ├── local.txt
│   └── production.txt
├── config/
│   ├── __init__.py
│   ├── asgi.py
│   ├── wsgi.py
│   ├── urls.py               # Root API Router mounting /api/v1/
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── local.py
│   │   └── production.py
├── apps/
│   ├── common/               # Shared base models, exceptions, pagination, utilities
│   │   ├── models.py
│   │   ├── exceptions.py
│   │   ├── pagination.py
│   │   ├── permissions.py
│   │   ├── renderers.py
│   │   └── utils.py
│   ├── accounts/             # User model, Staff registration, Admin approval, JWT Auth
│   ├── products/             # Category, Company, Product, ProductVariant, PriceAdjustment
│   ├── inventory/            # Inventory valuation, StockMovement, StockAdjustment
│   ├── customers/            # Customer entity, debt ledger, payment history
│   ├── sales/                # Sale, SaleItem, POS checkout workflows
│   ├── purchases/            # StockPurchase, PurchaseItem, restocking workflows
│   ├── accountability/       # Central financial cashbook, ManualExpense
│   ├── reports/              # Read-only aggregation selectors for BI & reporting
│   ├── dashboard/            # Read-only executive dashboard KPI aggregations
│   └── settings_app/         # Singleton pharmacy identity & system preferences
└── media/                    # Local storage for development product images
```

### 4.2 Application Responsibility Matrix

| Django App | Primary Domain Responsibility | Key Write Services | Key Read Selectors |
| :--- | :--- | :--- | :--- |
| `apps.accounts` | User identity, Approval lifecycle, Token issuance | `register_user`, `approve_user`, `reject_user`, `suspend_user` | `get_user_profile`, `list_pending_users` |
| `apps.products` | Product catalog, Categories, Companies, Variants, Pricing | `create_product`, `update_pricing`, `upload_product_image` | `get_product_detail`, `list_products_catalog` |
| `apps.inventory`| Live stock levels, Audit trail, Stock adjustments | `adjust_stock_manually`, `record_stock_movement` | `get_inventory_kpis`, `list_low_stock_items` |
| `apps.customers`| Customer directory, Debt calculation, Credit settlements | `create_customer`, `record_debt_payment` | `get_customer_debt_ledger`, `list_debtors` |
| `apps.sales` | POS transaction processing, Cart checkout, Invoicing | `process_pos_sale`, `cancel_sale` | `get_sale_receipt`, `list_sales_history` |
| `apps.purchases`| Stock procurement, Purchase orders, Inbound restock | `create_stock_purchase`, `cancel_purchase` | `get_purchase_detail`, `list_purchases` |
| `apps.accountability`| Central cashbook, Inflows, Outflows, Manual expenses | `record_manual_expense`, `post_financial_movement`| `get_cashbook_summary`, `list_movements` |
| `apps.reports` | Cross-domain read-only analytics & reporting | *None (Read-Only)* | `get_sales_report`, `get_profit_report`, etc. |
| `apps.dashboard`| Executive dashboard KPI cards & trend lines | *None (Read-Only)* | `get_executive_dashboard_data` |
| `apps.settings_app`| Global pharmacy metadata, POS rules, Thresholds | `update_system_settings` | `get_system_settings` |

---

## 5. Detailed Database Schema & Model Design

### 5.1 Common Abstract Models (`apps.common.models`)

#### `TimeStampedModel` (Abstract)
- `created_at`: `DateTimeField(auto_now_add=True, db_index=True)`
- `updated_at`: `DateTimeField(auto_now=True)`

#### `AuditableModel` (Abstract, inherits `TimeStampedModel`)
- `created_by`: `ForeignKey('accounts.User', on_delete=models.PROTECT, related_name="%(class)s_created", null=True, blank=True)`
- `updated_by`: `ForeignKey('accounts.User', on_delete=models.PROTECT, related_name="%(class)s_updated", null=True, blank=True)`

---

### 5.2 App: `accounts`

#### Model: `User` (Custom User Model inheriting `AbstractBaseUser`, `PermissionsMixin`)
- **Purpose:** Central staff authentication and role management.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `email`: `EmailField(unique=True, db_index=True)`
  - `full_name`: `CharField(max_length=150)`
  - `phone`: `CharField(max_length=20, unique=True, db_index=True)`
  - `role`: `CharField(max_length=20, choices=[('admin', 'Administrator'), ('cashier', 'Cashier')], default='cashier')`
  - `status`: `CharField(max_length=20, choices=[('PENDING', 'Pending Approval'), ('ACTIVE', 'Active'), ('REJECTED', 'Rejected'), ('SUSPENDED', 'Suspended')], default='PENDING', db_index=True)`
  - `is_active`: `BooleanField(default=False)` (Set to `True` only when `status == 'ACTIVE'`)
  - `is_staff`: `BooleanField(default=False)`
  - `is_superuser`: `BooleanField(default=False)`
  - `approved_at`: `DateTimeField(null=True, blank=True)`
  - `approved_by`: `ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_users')`
  - `rejected_at`: `DateTimeField(null=True, blank=True)`
  - `rejected_by`: `ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='rejected_users')`
  - `rejection_reason`: `TextField(blank=True, default='')`
  - `suspended_at`: `DateTimeField(null=True, blank=True)`
  - `suspended_by`: `ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='suspended_users')`
  - `last_login`: `DateTimeField(null=True, blank=True)`
  - `created_at`: `DateTimeField(auto_now_add=True)`
  - `updated_at`: `DateTimeField(auto_now=True)`
- **Constraints & Indexes:**
  - Unique constraint on `email` and `phone`.
  - Composite index on `(status, role)`.
- **Deletion Strategy:** Soft deactivation (`status = 'SUSPENDED'`, `is_active = False`). Hard delete forbidden to preserve historical transaction audit trails.

---

### 5.3 App: `products`

#### Model: `Category` (Inherits `TimeStampedModel`)
- **Purpose:** Pharmaceutical therapeutic categories (e.g. Antibiotics, Analgesics, Antimalarials).
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `name`: `CharField(max_length=100, unique=True)`
  - `description`: `TextField(blank=True, default='')`
  - `is_active`: `BooleanField(default=True, db_index=True)`
- **Deletion Strategy:** Soft delete via `is_active=False`.

#### Model: `Company` (Inherits `TimeStampedModel`)
- **Purpose:** Pharmaceutical manufacturing companies/brands (e.g. DANA, EMZOR, FIDSON, EMBASSY).
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `name`: `CharField(max_length=100, unique=True)`
  - `code`: `CharField(max_length=20, blank=True, default='')`
  - `country`: `CharField(max_length=50, default='Nigeria')`
  - `is_active`: `BooleanField(default=True, db_index=True)`
- **Deletion Strategy:** Soft delete via `is_active=False`.

#### Model: `Product` (Inherits `AuditableModel`)
- **Purpose:** Core generic pharmaceutical entity.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `name`: `CharField(max_length=200, db_index=True)` (e.g. "Paracetamol 500mg")
  - `generic_name`: `CharField(max_length=200, db_index=True)` (e.g. "Acetaminophen")
  - `category`: `ForeignKey(Category, on_delete=models.PROTECT, related_name='products')`
  - `dosage`: `CharField(max_length=50)` (e.g. "500mg", "250mg/5ml")
  - `dosage_form`: `CharField(max_length=50, choices=[('Tablet', 'Tablet'), ('Capsule', 'Capsule'), ('Syrup', 'Syrup'), ('Suspension', 'Suspension'), ('Injection', 'Injection'), ('Cream', 'Cream'), ('Ointment', 'Ointment'), ('Drops', 'Drops'), ('Inhaler', 'Inhaler'), ('Gel', 'Gel'), ('Infusion', 'Infusion'), ('Powder', 'Powder')])`
  - `barcode`: `CharField(max_length=64, blank=True, default='', db_index=True)`
  - `description`: `TextField(blank=True, default='')`
  - `subtitle`: `CharField(max_length=255, blank=True, default='')`
  - `image`: `ImageField(upload_to='products/%Y/%m/', null=True, blank=True)`
  - `status`: `CharField(max_length=20, choices=[('Active', 'Active'), ('Inactive', 'Inactive')], default='Active', db_index=True)`
- **Constraints & Indexes:**
  - Index on `name`, `generic_name`, and `barcode`.
- **Deletion Strategy:** Soft deactivation (`status = 'Inactive'`).

#### Model: `ProductVariant` (Inherits `AuditableModel`)
- **Purpose:** Resolves the `Product` + `Company` relationship. Represents the sellable SKU with controlled selling-price boundaries.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `product`: `ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')`
  - `company`: `ForeignKey(Company, on_delete=models.PROTECT, related_name='product_variants')`
  - `base_price`: `DecimalField(max_digits=12, decimal_places=2)` (Wholesale cost / inventory valuation base; Admin visibility only)
  - `min_selling_price`: `DecimalField(max_digits=12, decimal_places=2)` (Strict floor price for retail checkout)
  - `default_selling_price`: `DecimalField(max_digits=12, decimal_places=2)` (Standard recommended selling price)
  - `max_selling_price`: `DecimalField(max_digits=12, decimal_places=2)` (Strict ceiling price for retail checkout)
  - `current_stock`: `IntegerField(default=0)` (Denormalized current balance; maintained strictly by atomic services)
  - `reorder_level`: `IntegerField(default=10)` (Threshold for low-stock alerts)
  - `status`: `CharField(max_length=20, choices=[('Available', 'Available'), ('Inactive', 'Inactive')], default='Available', db_index=True)`
- **Constraints & Indexes:**
  - `UniqueConstraint(fields=['product', 'company'], name='unique_product_company_variant')`
  - Check constraint: `current_stock >= 0` (Enforced at DB level to prevent overselling)
  - Check constraint: `base_price >= 0 AND min_selling_price >= 0 AND default_selling_price >= min_selling_price AND max_selling_price >= default_selling_price`
  - Business Rule Validation: If `base_price > 0`, `min_selling_price` must exceed `base_price` (`min_selling_price > base_price`) to prevent negative-margin retail configurations.
- **Deletion Strategy:** Soft deactivation (`status = 'Inactive'`).

#### Model: `PriceAdjustmentHistory` (Inherits `TimeStampedModel`)
- **Purpose:** Audit log of all 4-tier price changes on product variants.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `variant`: `ForeignKey(ProductVariant, on_delete=models.CASCADE, related_name='price_history')`
  - `old_base_price`: `DecimalField(max_digits=12, decimal_places=2)`
  - `new_base_price`: `DecimalField(max_digits=12, decimal_places=2)`
  - `old_min_selling_price`: `DecimalField(max_digits=12, decimal_places=2)`
  - `new_min_selling_price`: `DecimalField(max_digits=12, decimal_places=2)`
  - `old_default_selling_price`: `DecimalField(max_digits=12, decimal_places=2)`
  - `new_default_selling_price`: `DecimalField(max_digits=12, decimal_places=2)`
  - `old_max_selling_price`: `DecimalField(max_digits=12, decimal_places=2)`
  - `new_max_selling_price`: `DecimalField(max_digits=12, decimal_places=2)`
  - `change_type`: `CharField(max_length=30, choices=[('INCREASE', 'Price Increase'), ('DECREASE', 'Price Decrease'), ('INITIAL', 'Initial Setup'), ('CORRECTION', 'Correction')])`
  - `reason`: `TextField()`
  - `adjusted_by`: `ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='price_adjustments')`
  - `effective_date`: `DateTimeField(default=timezone.now)`

---

### 5.4 App: `inventory`

#### Model: `InventoryMovement` (Inherits `TimeStampedModel`)
- **Purpose:** Append-only ledger of every unit added, subtracted, or adjusted across variants.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `variant`: `ForeignKey('products.ProductVariant', on_delete=models.PROTECT, related_name='inventory_movements')`
  - `movement_type`: `CharField(max_length=20, choices=[('STOCK_IN', 'Stock In'), ('STOCK_OUT', 'Stock Out'), ('ADJUSTMENT', 'Manual Adjustment')], db_index=True)`
  - `quantity`: `IntegerField()` (Positive for stock-in/reconciliation increase, negative for stock-out/decrease)
  - `previous_stock`: `IntegerField()`
  - `new_stock`: `IntegerField()`
  - `reason`: `CharField(max_length=255)`
  - `reference_type`: `CharField(max_length=30, choices=[('SALE', 'Sale Checkout'), ('STOCK_PURCHASE', 'Stock Purchase'), ('MANUAL_ADJUSTMENT', 'Manual Adjustment'), ('INITIAL_SETUP', 'Initial Inventory Setup')], db_index=True)`
  - `reference_id`: `CharField(max_length=64, blank=True, default='')` (e.g. Sale ID or Purchase ID)
  - `created_by`: `ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='recorded_stock_movements')`
- **Constraints & Indexes:**
  - Index on `(variant, created_at)`
  - Index on `(reference_type, reference_id)`
- **Deletion Strategy:** Strictly Immutable. Deletion forbidden.

---

### 5.5 App: `customers`

#### Model: `Customer` (Inherits `AuditableModel`)
- **Purpose:** Registered customer accounts eligible for credit tracking.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `name`: `CharField(max_length=150, db_index=True)`
  - `phone`: `CharField(max_length=20, unique=True, db_index=True)`
  - `email`: `EmailField(blank=True, default='')`
  - `address`: `TextField(blank=True, default='')`
  - `notes`: `TextField(blank=True, default='')`
  - `status`: `CharField(max_length=20, choices=[('Active', 'Active'), ('Inactive', 'Inactive')], default='Active', db_index=True)`
- **90-Day (3-Month) Inactivity Auto-Evaluation Rule:**
  - In addition to manual status overrides, customer activity is dynamically evaluated in selectors/serializers based on the latest transaction timestamp (the most recent `Sale.created_at` or `CustomerDebtPayment.created_at`, fallback to `Customer.created_at`).
  - If `status == 'Active'` but no transactions or debt payments have occurred within the past 90 days (`now() - last_activity > 90 days`), the customer is calculated and flagged as `Inactive` (Dormant) in customer lists and KPIs.
- **Role-Based Operation Boundaries:**
  - **Cashiers:** Can search/list customers, register new customers, and process debt recovery payments (`POST /api/v1/payments/debt-payment/`).
  - **Administrators:** Hold exclusive authority to modify customer master profiles (`PUT/PATCH /api/v1/customers/{id}/`) and toggle account status (`Active`/`Inactive`).
- **Walking Customer Architectural Rule:**
  - Anonymous or walk-in customers are **NEVER** created as rows in this table.
  - When a POS transaction occurs for a walk-in patron, `Sale.customer = NULL`.
- **Deletion Strategy:** Soft delete (`status = 'Inactive'`). Hard deletion is forbidden to preserve historical sales debt ledgers.

---

### 5.6 App: `sales`

#### Model: `Sale` (Inherits `AuditableModel`)
- **Purpose:** Master POS sales invoice.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `invoice_number`: `CharField(max_length=32, unique=True, db_index=True)` (e.g. `SAL-20260823-000145`)
  - `customer`: `ForeignKey('customers.Customer', on_delete=models.PROTECT, null=True, blank=True, related_name='sales')` (NULL represents Walk-in)
  - `subtotal`: `DecimalField(max_digits=12, decimal_places=2)`
  - `discount`: `DecimalField(max_digits=12, decimal_places=2, default=0.00)`
  - `total_amount`: `DecimalField(max_digits=12, decimal_places=2)` (`subtotal - discount`)
  - `amount_paid`: `DecimalField(max_digits=12, decimal_places=2)`
  - `outstanding_amount`: `DecimalField(max_digits=12, decimal_places=2)` (`total_amount - amount_paid`)
  - `payment_status`: `CharField(max_length=20, choices=[('PAID', 'Fully Paid'), ('PARTIAL', 'Partially Paid'), ('UNPAID', 'Credit / Unpaid')], db_index=True)`
  - `payment_method`: `CharField(max_length=20, choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS'), ('CREDIT', 'Credit')])`
  - `status`: `CharField(max_length=20, choices=[('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='COMPLETED', db_index=True)`
  - `notes`: `TextField(blank=True, default='')`
  - `served_by`: `ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='served_sales')`
- **Constraints & Indexes:**
  - Check constraint: `total_amount >= 0`
  - Check constraint: `amount_paid >= 0`
  - Check constraint: `outstanding_amount >= 0`
  - Index on `(created_at, payment_status)`
- **Deletion Strategy:** Soft cancellation via `status = 'CANCELLED'`. Reverses inventory and financial entries via atomic service.

#### Model: `SaleItem` (Inherits `TimeStampedModel`)
- **Purpose:** Line-item record within a sale. **Crucial for historical price integrity under the controlled selling-price range architecture.**
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `sale`: `ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')`
  - `variant`: `ForeignKey('products.ProductVariant', on_delete=models.PROTECT, related_name='sale_items')`
  - `quantity`: `IntegerField()` (Must be > 0)
  - `actual_selling_price`: `DecimalField(max_digits=12, decimal_places=2)` (The actual agreed/selected price at checkout within [min_selling_price, max_selling_price])
  - `unit_selling_price`: `DecimalField(max_digits=12, decimal_places=2)` (Alias snapshot of actual_selling_price for backward compatibility)
  - `historical_base_price`: `DecimalField(max_digits=12, decimal_places=2)` (Snapshot of wholesale cost at moment of sale; Admin visibility only)
  - `unit_base_price`: `DecimalField(max_digits=12, decimal_places=2)` (Alias snapshot of historical_base_price; Admin visibility only)
  - `min_selling_price`: `DecimalField(max_digits=12, decimal_places=2)` (Snapshot of allowable minimum price at moment of sale)
  - `default_selling_price`: `DecimalField(max_digits=12, decimal_places=2)` (Snapshot of default price at moment of sale)
  - `max_selling_price`: `DecimalField(max_digits=12, decimal_places=2)` (Snapshot of allowable maximum price at moment of sale)
  - `subtotal`: `DecimalField(max_digits=12, decimal_places=2)` (`quantity * actual_selling_price`)
  - `profit`: `DecimalField(max_digits=12, decimal_places=2)` (`(actual_selling_price - historical_base_price) * quantity`; Admin visibility only)
- **Historical Price Rule:**
  - Storing `actual_selling_price`, `historical_base_price`, and price bounds directly on `SaleItem` guarantees that subsequent product price modifications do not alter past financial audits, receipts, or historical profit figures. Profit is strictly calculated using the `actual_selling_price` minus the `historical_base_price`.

---

### 5.7 App: `payments` (Customer Debt Recovery)

#### Model: `CustomerDebtPayment` (Inherits `AuditableModel`)
- **Purpose:** Individual debt recovery transactions against a customer's outstanding balance.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `receipt_number`: `CharField(max_length=32, unique=True, db_index=True)` (e.g. `RCT-202608-00045`)
  - `customer`: `ForeignKey('customers.Customer', on_delete=models.PROTECT, related_name='debt_payments')`
  - `amount`: `DecimalField(max_digits=12, decimal_places=2)` (Must be > 0)
  - `payment_method`: `CharField(max_length=20, choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS')])`
  - `balance_before`: `DecimalField(max_digits=12, decimal_places=2)`
  - `balance_after`: `DecimalField(max_digits=12, decimal_places=2)`
  - `reference_notes`: `TextField(blank=True, default='')`
  - `recorded_by`: `ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='recorded_debt_payments')`
- **Debt Resolution Logic:**
  - On creation, the service allocates the paid amount across the customer's oldest unpaid/partially-paid `Sale` records, updating `amount_paid`, `outstanding_amount`, and `payment_status`.

---

### 5.8 App: `purchases`

#### Model: `StockPurchase` (Inherits `AuditableModel`)
- **Purpose:** Inbound inventory restocking invoice/order.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `purchase_number`: `CharField(max_length=32, unique=True, db_index=True)` (e.g. `PUR-202608-00012`)
  - `purchase_date`: `DateTimeField(default=timezone.now)`
  - `total_amount`: `DecimalField(max_digits=12, decimal_places=2)` (SUM of purchase items)
  - `payment_method`: `CharField(max_length=20, choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS')])`
  - `status`: `CharField(max_length=20, choices=[('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='COMPLETED', db_index=True)`
  - `note`: `TextField(blank=True, default='')`
  - `recorded_by`: `ForeignKey('accounts.User', on_delete=models.PROTECT, related_name='recorded_purchases')`
- **Deletion Strategy:** Soft cancellation via `status = 'CANCELLED'`.

#### Model: `PurchaseItem` (Inherits `TimeStampedModel`)
- **Purpose:** Line item on a restocking purchase order.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `purchase`: `ForeignKey(StockPurchase, on_delete=models.CASCADE, related_name='items')`
  - `variant`: `ForeignKey('products.ProductVariant', on_delete=models.PROTECT, related_name='purchase_items')`
  - `quantity`: `IntegerField()` (Must be > 0)
  - `unit_purchase_price`: `DecimalField(max_digits=12, decimal_places=2)` (Must be > 0)
  - `subtotal`: `DecimalField(max_digits=12, decimal_places=2)` (`quantity * unit_purchase_price`)

---

### 5.9 App: `accountability` (Central Financial Ledger)

#### Model: `AccountabilityTransaction` (Inherits `AuditableModel`)
- **Purpose:** The single, authoritative Cashbook/Ledger for all monetary inflows and outflows.
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `transaction_number`: `CharField(max_length=32, unique=True, db_index=True)` (e.g. `ACC-202608-000120`)
  - `direction`: `CharField(max_length=10, choices=[('IN', 'Cash Inflow'), ('OUT', 'Cash Outflow')], db_index=True)`
  - `type`: `CharField(max_length=30, choices=[('SALE', 'Sales Revenue'), ('DEBT_PAYMENT', 'Customer Debt Recovery'), ('STOCK_PURCHASE', 'Stock Purchase Disbursement'), ('OTHER_EXPENSE', 'Operational Expense')], db_index=True)`
  - `category`: `CharField(max_length=100)` (e.g. "Sales Revenue", "Utilities", "Transport", "Maintenance")
  - `amount`: `DecimalField(max_digits=12, decimal_places=2)` (Must be > 0)
  - `payment_method`: `CharField(max_length=20, choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS')])`
  - `reference_type`: `CharField(max_length=30)` (e.g. `'Sale'`, `'CustomerDebtPayment'`, `'StockPurchase'`, `'ManualExpense'`)
  - `reference_id`: `CharField(max_length=64)` (Primary key or reference number of source record)
  - `description`: `CharField(max_length=255)`
  - `customer_name`: `CharField(max_length=150, blank=True, default='')`
  - `note`: `TextField(blank=True, default='')`
  - `status`: `CharField(max_length=20, choices=[('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='COMPLETED')`
- **Constraints & Indexes:**
  - Index on `(created_at, direction, type)`
  - Index on `(reference_type, reference_id)`
- **Rule on Profit Terminology:**
  - `SUM(amount WHERE direction='IN') - SUM(amount WHERE direction='OUT')` is strictly defined as **`Net Cash Movement`**, NEVER as **`Profit`**. Profit is calculated strictly from `SaleItem` revenue minus base cost.

#### Model: `ManualExpense` (Inherits `AuditableModel`)
- **Purpose:** Standalone operational and miscellaneous pharmacy expenses (e.g. Generator Fuel, Stationery, Rent).
- **Fields:**
  - `id`: `BigAutoField(primary_key=True)`
  - `expense_number`: `CharField(max_length=32, unique=True, db_index=True)` (e.g. `EXP-202608-00014`)
  - `category`: `CharField(max_length=50, choices=[('Transport', 'Transport'), ('Utilities', 'Utilities'), ('Stationery', 'Stationery'), ('Maintenance', 'Maintenance'), ('Other', 'Other')])`
  - `amount`: `DecimalField(max_digits=12, decimal_places=2)`
  - `payment_method`: `CharField(max_length=20, choices=[('CASH', 'Cash'), ('TRANSFER', 'Bank Transfer'), ('POS', 'Card / POS')])`
  - `description`: `CharField(max_length=255)`
  - `note`: `TextField(blank=True, default='')`

---

### 5.10 App: `settings_app`

#### Model: `SystemSettings` (Singleton Model inheriting `TimeStampedModel`)
- **Purpose:** Single-row configuration table for pharmacy branding and operational rules.
- **Fields:**
  - `id`: `PositiveIntegerField(primary_key=True, default=1, editable=False)`
  - `pharmacy_name`: `CharField(max_length=150, default='Al-Amaan Pharmacy')`
  - `phone`: `CharField(max_length=50, default='+234 800 000 0000')`
  - `email`: `EmailField(default='contact@alamaanpharmacy.com')`
  - `address`: `TextField(default='Suite 12, Commercial Plaza, Kano, Nigeria')`
  - `logo`: `ImageField(upload_to='settings/', null=True, blank=True)`
  - `business_description`: `TextField(blank=True, default='Licensed Retail Pharmacy & Healthcare Provider')`
  - `currency`: `CharField(max_length=10, default='NGN')`
  - `currency_symbol`: `CharField(max_length=5, default='₦')`
  - `show_decimals`: `BooleanField(default=True)`
  - `allow_walking_sales`: `BooleanField(default=True)`
  - `allow_credit_sales`: `BooleanField(default=True)`
  - `require_customer_for_credit`: `BooleanField(default=True)`
  - `low_stock_threshold`: `IntegerField(default=10)`
  - `allow_negative_stock`: `BooleanField(default=False)`
  - `receipt_footer`: `TextField(default='Thank you for your patronage. Get well soon!')`
- **Singleton Enforcement:**
  - `save()` method override forces `self.pk = 1` to ensure only one configuration row exists.

---

## 6. Serializer Architecture & Data Transfer Objects (DTOs)

### 6.1 General Serialization Guidelines
- **Input Validation:** Perform syntax, type, and field-level validation (e.g. `validate_phone()`, `validate_amount()`) in DRF Serializers.
- **No Complex Business Operations in `serializer.save()`:** Multi-table atomic operations (e.g. cart stock deduction, ledger updates) MUST be delegated to the **Service Layer**, not written inside `Serializer.create()` or `update()`.
- **Field Redaction for Role Privacy:**
  - `base_price`, `unit_base_price`, and `profit` fields must be dynamically stripped from serializer outputs when the requesting user has `role == 'cashier'`. This is enforced via dynamic serializer context inspection (`self.context['request'].user.role`).

### 6.2 Key Serializers Matrix

| Domain | Serializer Name | Type | Input Fields / Output Fields |
| :--- | :--- | :--- | :--- |
| **Accounts** | `UserRegistrationSerializer` | Input | `email`, `password`, `full_name`, `phone` |
| | `UserSummarySerializer` | Output | `id`, `email`, `full_name`, `phone`, `role`, `status`, `created_at` |
| | `UserDetailSerializer` | Output | Full audit timestamps, approval info, permissions |
| **Products** | `ProductVariantInputSerializer` | Input | `company_id`, `base_price`, `min_selling_price`, `default_selling_price`, `max_selling_price`, `current_stock`, `reorder_level` |
| | `ProductCreateUpdateSerializer` | Input | `name`, `generic_name`, `category_id`, `dosage`, `dosage_form`, `barcode`, `description`, `variants` (nested) |
| | `ProductListSerializer` | Output | Product card with company variants list, formatted price ranges, category name |
| | `ProductDetailSerializer` | Output | Full catalog entity, 4-tier price history timeline, movement logs |
| **Inventory** | `StockAdjustmentInputSerializer`| Input | `variant_id`, `adjustment_type` (`SET_EXACT`/`INCREMENT`/`DECREMENT`), `quantity`, `reason`, `notes` |
| | `InventoryItemSerializer` | Output | Variant detail + product info, stock status tag, inventory valuation |
| **Customers** | `CustomerCreateUpdateSerializer`| Input | `name`, `phone`, `email`, `address`, `notes` |
| | `CustomerDetailSerializer` | Output | Profile + calculated `outstanding_debt`, `total_purchases`, `amount_paid` |
| **Sales** | `CreateSaleItemInputSerializer` | Input | `product_variant_id`, `quantity`, `actual_selling_price` (validated within `[min_selling_price, max_selling_price]`) |
| | `CreateSaleInputSerializer` | Input | `customer_id` (nullable), `items` (list), `discount`, `amount_paid`, `payment_method`, `notes` |
| | `SaleReceiptSerializer` | Output | Complete formatted receipt structure with line items and cashier name |
| **Purchases** | `CreatePurchaseInputSerializer` | Input | `payment_method`, `purchase_date`, `note`, `items` (list of variant_id, quantity, unit_purchase_price) |
| | `StockPurchaseDetailSerializer` | Output | Full purchase record with itemized breakdown and audit metadata |
| **Accountability**| `CreateExpenseInputSerializer` | Input | `description`, `category`, `amount`, `payment_method`, `note` |
| | `AccountabilityTransactionSerializer`| Output | Cashbook entry with direction, type, reference links, and running balances |

---

## 7. Service Layer & Business Transaction Boundaries

All state-mutating operations spanning multiple tables or financial balances **MUST** reside in `services.py` within their respective domain apps and execute inside `django.db.transaction.atomic`.

### 7.1 Key Service Workflows

#### `sales.services.process_pos_sale(user, validated_data)`
```
1. Begin atomic transaction (transaction.atomic)
2. Lock ProductVariant rows using select_for_update() for all item variant IDs in cart.
3. Validate inventory and pricing boundaries for every item:
   a. Current stock >= requested quantity. If insufficient, raise ValidationError("Insufficient stock for {product_name} ({company})").
   b. Actual selling price falls within the variant's allowed bounds:
      variant.min_selling_price <= item.actual_selling_price <= variant.max_selling_price.
      If violated, raise ValidationError("Selling price for {product_name} must be between {min} and {max}.").
4. Calculate subtotal (SUM(item.actual_selling_price * item.quantity)), discount, total_amount, amount_paid, outstanding_amount.
5. Determine payment_status:
   - If outstanding_amount == 0 -> 'PAID'
   - If amount_paid > 0 and outstanding_amount > 0 -> 'PARTIAL'
   - If amount_paid == 0 -> 'UNPAID' (Credit)
6. If payment_status in ['PARTIAL', 'UNPAID'] and customer is NULL:
   -> Raise ValidationError("Credit sales require a registered customer.").
7. Generate unique invoice_number (e.g. SAL-YYYYMMDD-XXXXXX).
8. Create Sale instance.
9. For each item in cart:
   a. Capture permanent snapshots: actual_selling_price, historical_base_price = variant.base_price, min_selling_price, default_selling_price, max_selling_price.
   b. Calculate item subtotal (actual_selling_price * quantity) and profit: (actual_selling_price - historical_base_price) * quantity.
   c. Create SaleItem record with all historical price snapshots.
   d. Decrement ProductVariant.current_stock by quantity.
   e. Save ProductVariant.
   f. Create InventoryMovement record (type='STOCK_OUT', reference_type='SALE', reference_id=sale.id).
10. If amount_paid > 0:
   a. Create AccountabilityTransaction (direction='IN', type='SALE', amount=amount_paid, reference_id=sale.id).
11. Commit transaction and return hydrated Sale instance.
```

#### `payments.services.record_customer_debt_payment(user, customer, amount, payment_method, notes)`
```
1. Begin atomic transaction (transaction.atomic)
2. Lock Customer row with select_for_update().
3. Query all unpaid/partial sales for customer ordered by created_at ASC (FIFO debt clearing).
4. Calculate total outstanding balance. If amount > total_outstanding:
   -> Raise ValidationError("Payment amount exceeds total outstanding debt.").
5. Record balance_before = total_outstanding.
6. Allocate payment amount across sales:
   - For each sale in unpaid_sales:
     - Needed = sale.outstanding_amount
     - PayForSale = min(remaining_payment, needed)
     - sale.amount_paid += PayForSale
     - sale.outstanding_amount -= PayForSale
     - sale.payment_status = 'PAID' if sale.outstanding_amount == 0 else 'PARTIAL'
     - sale.save()
     - remaining_payment -= PayForSale
     - Break if remaining_payment == 0.
7. Record balance_after = balance_before - amount.
8. Create CustomerDebtPayment record.
9. Create AccountabilityTransaction (direction='IN', type='DEBT_PAYMENT', amount=amount, reference_id=payment.id).
10. Commit transaction and return CustomerDebtPayment instance.
```

#### `purchases.services.create_stock_purchase(user, validated_data)`
```
1. Begin atomic transaction (transaction.atomic)
2. Generate purchase_number (e.g. PUR-YYYYMM-XXXXX).
3. Create StockPurchase record.
4. For each item in purchase items list:
   a. Lock ProductVariant with select_for_update().
   b. Create PurchaseItem record.
   c. Increment ProductVariant.current_stock by quantity.
   d. If unit_purchase_price != ProductVariant.base_price:
      - (Optional) Update ProductVariant.base_price and log PriceAdjustmentHistory if configured.
   e. Save ProductVariant.
   f. Create InventoryMovement (type='STOCK_IN', reference_type='STOCK_PURCHASE', reference_id=purchase.id).
5. Create AccountabilityTransaction (direction='OUT', type='STOCK_PURCHASE', amount=total_amount, reference_id=purchase.id).
6. Commit transaction and return StockPurchase instance.
```

#### `inventory.services.adjust_stock_manually(user, variant, adjustment_type, quantity, reason, notes)`
```
1. Begin atomic transaction (transaction.atomic)
2. Lock ProductVariant with select_for_update().
3. Capture previous_stock = variant.current_stock.
4. Calculate new_stock:
   - If 'SET_EXACT' -> new_stock = quantity
   - If 'INCREMENT' -> new_stock = previous_stock + quantity
   - If 'DECREMENT' -> new_stock = previous_stock - quantity
5. Validate new_stock >= 0. If new_stock < 0:
   -> Raise ValidationError("Stock adjustment cannot result in negative inventory.").
6. Delta = new_stock - previous_stock.
7. Update variant.current_stock = new_stock; save variant.
8. Create InventoryMovement (type='ADJUSTMENT', quantity=Delta, previous_stock=previous_stock, new_stock=new_stock, reason=reason, reference_type='MANUAL_ADJUSTMENT').
9. Commit transaction and return updated variant.
```

---

## 8. Concurrency Control, Race Prevention & Idempotency

### 8.1 Preventing Negative Inventory & Race Conditions
In a multi-cashier environment, two staff members might sell the last 3 units of *Amoxicillin (Emzor)* simultaneously.
1. **Pessimistic Locking (`select_for_update()`):** All stock decrement and increment routines MUST acquire an exclusive row-level lock on the targeted `ProductVariant` record inside an atomic transaction block:
   ```python
   # Architectural requirement for inventory services:
   variant = ProductVariant.objects.select_for_update().get(id=variant_id)
   ```
2. **Database-Level Check Constraint:** The MySQL schema MUST include `CHECK (current_stock >= 0)` on the `products_productvariant` table to physically reject any race condition that slips past application checks.

### 8.2 API Idempotency Keys
For financial mutating operations (`POST /api/v1/sales/`, `POST /api/v1/payments/`, `POST /api/v1/purchases/`):
- Frontend may transmit an `X-Idempotency-Key: <UUID>` header.
- The backend caches the outcome of the request keyed by `idempotency_{user_id}_{key}` in Redis/Cache for 120 seconds. If a duplicate request arrives while processing or immediately after completion, DRF returns the cached response instead of re-executing the financial transaction.

---

## 9. Role-Based Access Control (RBAC) & Security Architecture

### 9.1 User Role Hierarchy
- **`ADMIN` (Administrator / Supervising Pharmacist):** Full access across all modules, sensitive base-price cost data, profit reports, user approval/management, system settings, manual stock adjustments, customer profile editing/deactivation, procurement orders, shift logs, and expense entries.
- **`CASHIER` (Dispensing Cashier / Sales Staff):** Restricted operational access focused on POS checkout, customer search, customer registration, debt payment collection, retail price viewing, sales receipt printing, and viewing their operational dashboard summary. Redacted access for wholesale base prices, item profits, system settings, accountability/shift logs, staff administration, and procurement.

### 9.2 Complete RBAC Permission Matrix

| Module / Operation | Admin Permission | Cashier Permission | Enforcement Layer |
| :--- | :--- | :--- | :--- |
| **Auth: Register Staff** | Allow (Public) | Allow (Public) | `AllowAny` |
| **Auth: Approve / Reject / Suspend Staff** | Allow | **DENIED (403)** | `IsAdminUserRole` |
| **Users: View Staff Directory & Approvals** | Allow | **DENIED (403)** | `IsAdminUserRole` (Hidden from UI) |
| **Products: View Catalog & Selling Price** | Allow | Allow | `IsAuthenticated` |
| **Products: View Base Cost Price** | Allow | **REDACTED (Hidden)** | `Serializer Field Redaction` |
| **Products: Create / Edit Product & Variant**| Allow | **DENIED (403)** | `IsAdminUserRole` |
| **Products: Adjust Prices** | Allow | **DENIED (403)** | `IsAdminUserRole` |
| **Inventory: View Stock Levels** | Allow | Allow | `IsAuthenticated` |
| **Inventory: View Inventory Valuation Cost**| Allow | **REDACTED (Hidden)** | `Serializer Field Redaction` |
| **Inventory: Perform Stock Adjustment** | Allow | **DENIED (403)** | `IsAdminUserRole` |
| **Customers: List / Search Customers** | Allow | Allow | `IsAuthenticated` |
| **Customers: Register New Customer** | Allow | Allow | `IsAuthenticated` |
| **Customers: View Outstanding Debt** | Allow | Allow | `IsAuthenticated` |
| **Customers: Edit Profile / Toggle Status** | Allow | **DENIED (403)** | `IsAdminUserRole` |
| **Sales: Process POS Sale** | Allow | Allow | `IsAuthenticated` |
| **Sales: View Sale Profit** | Allow | **REDACTED (Hidden)** | `Serializer Field Redaction` |
| **Sales: Cancel Completed Sale** | Allow | **DENIED (403)** | `IsAdminUserRole` |
| **Payments: Record Customer Debt Payment** | Allow | Allow | `IsAuthenticated` |
| **Purchases: View & Create Stock Purchases**| Allow | **DENIED (403)** | `IsAdminUserRole` (Hidden from UI) |
| **Accountability: Record Expenses** | Allow | **DENIED (403)** | `IsAdminUserRole` (Hidden from UI) |
| **Accountability: View Cashbook & Shift Logs**| Allow | **DENIED (403)** | `IsAdminUserRole` (Hidden from UI) |
| **Reports: Sales / Profit / Inventory BI** | Allow | **DENIED (403)** | `IsAdminUserRole` (Hidden from UI) |
| **Settings: View System Preferences** | Allow | **Read-Only / Redacted** | `IsAuthenticated` (Hidden from Cashier Header UI) |
| **Settings: Update Configuration** | Allow | **DENIED (403)** | `IsAdminUserRole` |
| **Dashboard: Operational Summary (Dispensed, Debtors, Stock Health)** | Allow | **Allow (Role-Tailored)**| `IsAuthenticated` |
| **Dashboard: Executive Financials (Profit, Margin, Valuation, Cashflow)** | Allow | **REDACTED (Hidden)** | `IsAdminUserRole` |

### 9.3 Header & Navigation Role-Isolation Rules
1. **Header User Dropdown Menu:** "System Preferences & Settings", "Accountability & Shift Logs", and "Staff Accounts & Approvals" are strictly rendered for `ADMIN` users only. For `CASHIER` accounts, these navigation items are excluded from the header menu.
2. **Header Notification Feeds:** System-level procurement notices, audit alerts, and user registration approvals are filtered out for cashiers, ensuring notifications focus strictly on inventory alerts and customer transactions.
3. **Frontend Route Guards:** Direct client navigation to administrative views (`/settings`, `/accountability`, `/stock-purchase`, `/reports`, `/users`) by cashiers is intercepted by role-guard boundary cards, redirecting back to `/sales`. Backend API endpoints enforce 403 Forbidden responses independently of frontend state.

---

## 10. Query / Selector Layer & Performance Optimization

To prevent N+1 query bottlenecks and ensure sub-100ms API response times across millions of transactional records, all read-only analytics and complex lists MUST use dedicated Selectors in `selectors.py`.

### 10.1 ORM Optimization Rules
1. **Foreign Key Traversals:** Always use `select_related('product', 'company')` when querying `ProductVariant`.
2. **Reverse Collections & M2M:** Always use `prefetch_related('variants__company', 'variants__price_history')` when querying `Product`.
3. **Database-Level Aggregation:** Never loop over querysets in Python to compute sums or averages. Use Django `aggregate()` and `annotate()`.

### 10.2 Core Selector Definitions (`selectors.py`)

#### `apps.inventory.selectors.get_inventory_summary_kpis(user)`
```python
# Computes inventory valuation and stock health entirely in MySQL:
# Total Units = SUM(current_stock)
# Inventory Value (Cost) = SUM(current_stock * base_price) [Admin only]
# Potential Sales Value = SUM(current_stock * selling_price)
# Low Stock Count = COUNT(WHERE current_stock > 0 AND current_stock <= reorder_level)
# Out of Stock Count = COUNT(WHERE current_stock = 0)
```

#### `apps.reports.selectors.get_profit_report_data(start_date, end_date)`
```python
# Aggregates SaleItem records directly:
# Total Revenue = SUM(subtotal)
# Total Cost = SUM(quantity * unit_base_price)
# Gross Profit = SUM(profit)
# Gross Margin % = (Gross Profit / Total Revenue) * 100
# Grouped by Category and Company via values('variant__product__category__name').annotate(...)
```

#### `apps.accountability.selectors.get_cashbook_summary(timeframe, start_date, end_date)`
```python
# Aggregates AccountabilityTransaction:
# Money In = SUM(amount WHERE direction='IN')
# Money Out = SUM(amount WHERE direction='OUT')
# Net Movement = Money In - Money Out
```

---

## 11. Signals Evaluation & Architectural Constraints

### 11.1 Explicit Prohibition of Implicit Signals
Django `post_save`, `pre_save`, and `post_delete` signals are **STRICTLY PROHIBITED** for orchestrating multi-table business logic (e.g. adjusting stock or creating financial ledger entries upon saving a `SaleItem`).

### 11.2 Architectural Reasons
1. **Hidden Side Effects:** Signals make atomic rollbacks and testing unpredictable.
2. **Bulk Operation Bypass:** Bulk queries (`bulk_create`, `update()`) do not trigger signals, leading to silent database state corruption.
3. **Lack of User Context:** Signals do not cleanly inherit the active `request.user` without risky thread-local workarounds.
4. **Conclusion:** All multi-table workflows MUST be explicitly invoked via the **Service Layer**.

---

## 12. Media & Product Image Storage Strategy

### 12.1 Specifications
- **Allowed Formats:** `.jpg`, `.jpeg`, `.png`, `.webp`
- **Max File Size:** 2 MB (2,097,152 bytes)
- **Dimensions:** Normalized to max 800x800px on upload via Pillow image compression.
- **Storage Paths:**
  - Development: Local filesystem at `media/products/%Y/%m/`
  - Production: Secure S3 / Google Cloud Storage bucket with CloudFront / CDN distribution.
- **Security:** Filename hashing (`uuid4().hex`) on upload to eliminate path traversal vulnerabilities and duplicate naming collisions.

---

## 13. Complete RESTful API Endpoint Specification (`/api/v1/`)

All API routes are prefixed with `/api/v1/`. Responses return standard JSON.

### 13.1 Authentication & User Management (`/api/v1/auth/` & `/api/v1/users/`)

| Method | Endpoint | Purpose | Access | Key Payload / Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/auth/register/` | Register new staff account | `AllowAny` | `{ email, password, full_name, phone }` | `201 Created` |
| `POST` | `/auth/login/` | Staff login & obtain JWT | `AllowAny` | `{ email, password }` | `200 OK` |
| `POST` | `/auth/token/refresh/`| Refresh expired JWT token | `AllowAny` | `{ refresh }` | `200 OK` |
| `GET` | `/auth/me/` | Get current user profile | `IsAuth` | *None* | `200 OK` |
| `POST` | `/auth/change-password/`| Change current user password | `IsAuth` | `{ current_password, new_password }` | `200 OK` |
| `GET` | `/users/` | List staff accounts (filter by status) | `AdminOnly` | `?status=PENDING&role=cashier&search=` | `200 OK` |
| `GET` | `/users/{id}/` | Get detailed staff account | `AdminOnly` | *None* | `200 OK` |
| `POST` | `/users/{id}/approve/`| Approve pending staff account | `AdminOnly` | `{ assigned_role: "cashier" }` | `200 OK` |
| `POST` | `/users/{id}/reject/` | Reject pending staff account | `AdminOnly` | `{ reason: "Invalid staff ID" }` | `200 OK` |
| `POST` | `/users/{id}/suspend/`| Suspend active staff account | `AdminOnly` | *None* | `200 OK` |
| `POST` | `/users/{id}/reactivate/`| Reactivate suspended account| `AdminOnly` | *None* | `200 OK` |

---

### 13.2 Products & Catalog (`/api/v1/products/`, `/categories/`, `/companies/`)

| Method | Endpoint | Purpose | Access | Key Payload / Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/categories/` | List active categories | `IsAuth` | `?search=` | `200 OK` |
| `POST` | `/categories/` | Create product category | `AdminOnly` | `{ name, description }` | `201 Created` |
| `GET` | `/companies/` | List pharmaceutical manufacturers | `IsAuth` | `?search=` | `200 OK` |
| `POST` | `/companies/` | Create manufacturer company | `AdminOnly` | `{ name, code, country }` | `201 Created` |
| `GET` | `/products/` | Paginated product catalog | `IsAuth` | `?search=&category=&company=&stock_status=&page=` | `200 OK` |
| `POST` | `/products/` | Create product + company variants | `AdminOnly` | Multi-part Form `{ name, generic_name, category_id, dosage, form, image, variants: [...] }` | `201 Created` |
| `GET` | `/products/{id}/` | Get full product detail | `IsAuth` | *None* | `200 OK` |
| `PUT/PATCH`| `/products/{id}/`| Update product catalog info | `AdminOnly` | `{ name, generic_name, category_id, description, status }` | `200 OK` |
| `POST` | `/products/{id}/variants/`| Add company variant to product | `AdminOnly` | `{ company_id, base_price, min_selling_price, default_selling_price, max_selling_price, current_stock, reorder_level }` | `201 Created` |
| `PUT/PATCH`| `/products/variants/{variant_id}/`| Update variant prices/status | `AdminOnly` | `{ base_price, min_selling_price, default_selling_price, max_selling_price, reorder_level, status }` | `200 OK` |
| `POST` | `/products/variants/{variant_id}/price-adjustment/`| Log 4-tier price adjustment | `AdminOnly` | `{ new_base_price, new_min_selling_price, new_default_selling_price, new_max_selling_price, reason }` | `200 OK` |
| `GET` | `/products/kpi-stats/`| Catalog KPI summary | `IsAuth` | *None* (Cost values redacted for cashier) | `200 OK` |

---

### 13.3 Inventory & Stock Control (`/api/v1/inventory/`)

| Method | Endpoint | Purpose | Access | Key Payload / Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/inventory/` | Paginated live inventory items | `IsAuth` | `?search=&category=&company=&stock_status=&page=` | `200 OK` |
| `GET` | `/inventory/summary-kpis/`| Inventory valuation & health KPIs | `IsAuth` | *None* (Valuation cost redacted for cashier) | `200 OK` |
| `POST` | `/inventory/adjust/` | Manual stock adjustment | `AdminOnly` | `{ variant_id, adjustment_type, quantity, reason, notes }` | `200 OK` |
| `GET` | `/inventory/movements/` | Auditable stock movement log | `AdminOnly` | `?variant_id=&movement_type=&start_date=&end_date=` | `200 OK` |
| `GET` | `/inventory/insights/` | Inventory distribution & analytics | `AdminOnly` | `?timeframe=this_month` | `200 OK` |

---

### 13.4 Customers & Credit Directory (`/api/v1/customers/`)

| Method | Endpoint | Purpose | Access | Key Payload / Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/customers/` | Paginated customer list with debt & 90-day inactivity status | `IsAuth` | `?search=&debt_status=&status=&page=` | `200 OK` |
| `POST` | `/customers/` | Register new customer | `IsAuth` | `{ name, phone, email, address, notes }` | `201 Created` |
| `GET` | `/customers/{id}/` | Get customer profile & balance | `IsAuth` | *None* | `200 OK` |
| `PUT/PATCH`| `/customers/{id}/` | Update customer contact info | `AdminOnly` | `{ name, phone, email, address, notes, status }` | `200 OK` |
| `POST` | `/customers/{id}/toggle-status/`| Activate/Deactivate customer | `AdminOnly` | *None* | `200 OK` |
| `GET` | `/customers/{id}/sales/`| Customer sales history | `IsAuth` | `?page=` | `200 OK` |
| `GET` | `/customers/{id}/payments/`| Customer debt payment history | `IsAuth` | `?page=` | `200 OK` |
| `GET` | `/customers/summary-kpis/`| Customer summary metrics | `IsAuth` | *None* | `200 OK` |

---

### 13.5 Sales & Point of Sale (`/api/v1/sales/` & `/api/v1/payments/`)

| Method | Endpoint | Purpose | Access | Key Payload / Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/sales/` | Paginated sales transactions | `IsAuth` | `?search=&date_range=&payment_status=&customer_type=&page=` | `200 OK` |
| `POST` | `/sales/` | Checkout POS Cart (Create Sale)| `IsAuth` | `{ customer_id: null, items: [{ product_variant_id, quantity, actual_selling_price }], discount, amount_paid, payment_method, notes }` | `201 Created` |
| `GET` | `/sales/{id}/` | Get sale detail & line items | `IsAuth` | *None* | `200 OK` |
| `GET` | `/sales/{id}/receipt/` | Formatted receipt printing payload | `IsAuth` | *None* | `200 OK` |
| `POST` | `/sales/{id}/cancel/` | Void / Cancel sale | `AdminOnly` | `{ reason: "Customer return" }` | `200 OK` |
| `GET` | `/sales/summary-kpis/` | Sales summary KPIs | `IsAuth` | `?date_range=today` (Profit redacted for cashier) | `200 OK` |
| `POST` | `/payments/debt-payment/`| Record customer debt recovery | `IsAuth` | `{ customer_id, amount, payment_method, reference_notes }` | `201 Created` |
| `GET` | `/payments/receipt/{id}/`| Debt payment receipt | `IsAuth` | *None* | `200 OK` |

---

### 13.6 Stock Purchases & Procurement (`/api/v1/purchases/`)

| Method | Endpoint | Purpose | Access | Key Payload / Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/purchases/` | Paginated stock purchase orders | `AdminOnly` | `?search=&date_range=&payment_method=&status=&page=` | `200 OK` |
| `POST` | `/purchases/` | Record stock purchase restock | `AdminOnly` | `{ payment_method, purchase_date, note, items: [{ product_variant_id, quantity, unit_purchase_price }] }` | `201 Created` |
| `GET` | `/purchases/{id}/` | Get purchase order details | `AdminOnly` | *None* | `200 OK` |
| `POST` | `/purchases/{id}/cancel/`| Cancel purchase order | `AdminOnly` | `{ reason: "Supplier error" }` | `200 OK` |
| `GET` | `/purchases/summary-kpis/`| Stock purchase summary metrics | `AdminOnly` | `?date_range=this_month` | `200 OK` |

---

### 13.7 Financial Accountability & Cashbook (`/api/v1/accountability/`)

| Method | Endpoint | Purpose | Access | Key Payload / Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/accountability/` | Cashbook ledger transactions | `AdminOnly` | `?direction=&type=&date_range=&page=` | `200 OK` |
| `GET` | `/accountability/summary/`| Cashbook Money In/Out totals | `AdminOnly` | `?date_range=today` | `200 OK` |
| `POST` | `/accountability/expenses/`| Record operational expense | `AdminOnly` | `{ description, category, amount, payment_method, note }` | `201 Created` |

---

### 13.8 Financial & Operational Reports (`/api/v1/reports/`)

| Method | Endpoint | Purpose | Access | Key Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/reports/overview/` | Executive financial summary | `AdminOnly` | `?date_range=this_month&start_date=&end_date=` | `200 OK` |
| `GET` | `/reports/sales/` | Detailed sales & revenue report| `AdminOnly` | `?date_range=this_month` | `200 OK` |
| `GET` | `/reports/profit/` | Gross profit & margin report | `AdminOnly` | `?date_range=this_month` | `200 OK` |
| `GET` | `/reports/purchases/` | Stock replenishment cost report| `AdminOnly` | `?date_range=this_month` | `200 OK` |
| `GET` | `/reports/financial-movement/`| Cashflow In/Out report | `AdminOnly` | `?date_range=this_month` | `200 OK` |
| `GET` | `/reports/inventory-movement/`| Unit In/Out movement report | `AdminOnly` | `?date_range=this_month` | `200 OK` |
| `GET` | `/reports/debt/` | Customer credit & debt report | `AdminOnly` | `?date_range=this_month` | `200 OK` |

---

### 13.9 Role-Aware Dashboard & System Settings (`/api/v1/dashboard/` & `/settings/`)

| Method | Endpoint | Purpose | Access | Key Payload / Query Params | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/dashboard/` | Role-aware dashboard (Executive KPIs for Admin; Operational KPIs for Cashier)| `IsAuth` | `?period=today` | `200 OK` |
| `GET` | `/dashboard/cashier-summary/` | Dedicated Cashier operational KPIs (Sales, checkouts, units dispensed, active debtors, stock alerts) | `IsAuth` | `?period=today` | `200 OK` |
| `GET` | `/settings/` | Get pharmacy branding, contact info & receipt config | `IsAuth` | *None* | `200 OK` |
| `PUT/PATCH`| `/settings/` | Update system configuration & pharmacy settings | `AdminOnly` | Multipart Form / JSON with config keys | `200 OK` |

---

## 14. HTTP Status Codes, Error Handling & API Response Envelope

### 14.1 Standard Response Envelopes

#### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": "Resource processed successfully.",
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 120,
    "total_pages": 8
  }
}
```

#### Error Envelope (Consistent with DRF Custom Exception Handler)
```json
{
  "success": false,
  "error": "INSUFFICIENT_STOCK",
  "message": "Insufficient stock for Paracetamol 500mg (Emzor). Available: 2 units, Requested: 5 units.",
  "errors": {
    "items": ["Variant ID 14 exceeds current inventory balance."]
  }
}
```

### 14.2 Standard HTTP Status Codes
- `200 OK`: Successful read or update.
- `201 Created`: Successful creation of product, sale, payment, or purchase.
- `204 No Content`: Successful deactivation.
- `400 Bad Request`: Validation failure or business rule violation (e.g. credit sale without customer).
- `401 Unauthorized`: Missing or invalid JWT Bearer token.
- `403 Forbidden`: Account pending approval, suspended, or insufficient role permissions.
- `404 Not Found`: Resource ID does not exist.
- `409 Conflict`: Concurrency locking timeout or duplicate unique constraint violation.
- `429 Too Many Requests`: Rate limiter triggered on login or sensitive endpoints.
- `500 Internal Server Error`: Unhandled server exception (stack traces suppressed in production).

---

## 15. Frontend-to-Backend Contract Mapping

| Frontend View / Component | Triggered Action | Required Backend API Endpoint | Backend Module | Enforced Business Rule |
| :--- | :--- | :--- | :--- | :--- |
| `AuthContainer.tsx` | Staff Register Form Submit | `POST /api/v1/auth/register/` | `accounts` | Account created in `PENDING` status. Cannot login until Admin approval. |
| `AuthContainer.tsx` | Staff Login Submit | `POST /api/v1/auth/login/` | `accounts` | Only `ACTIVE` accounts receive JWT pair. `PENDING`/`SUSPENDED` return 403. |
| `UserManagementModule.tsx` | Admin clicks "Approve" | `POST /api/v1/users/{id}/approve/` | `accounts` | Admin only. Sets `status='ACTIVE'`, `is_active=True`, records `approved_by`. |
| `HeaderUserMenu.tsx` | Staff Navigation shortcuts | Conditional client menu rendering | `accounts` | "Staff Accounts & Approvals", "System Preferences & Settings", and "Accountability & Shift Logs" are rendered exclusively for `admin` role. |
| `ProductWizard.tsx` | Create Product Form | `POST /api/v1/products/` | `products` | Admin only. Creates `Product` + `ProductVariant` SKUs in one atomic transaction. |
| `ProductListTable.tsx` | Table search & filter | `GET /api/v1/products/` | `products` | Base price hidden from Cashier role. Filter by category, company, stock status. |
| `InventoryModule.tsx` | Quick Stock Adjustment Modal | `POST /api/v1/inventory/adjust/` | `inventory` | Admin only. Updates variant stock, appends `InventoryMovement` log. Stock >= 0. |
| `SalesModule.tsx` (POS) | "Complete Sale" Button | `POST /api/v1/sales/` | `sales` | Locks stock (`select_for_update`), creates `Sale` + `SaleItem`, decrements stock, posts to `AccountabilityTransaction`. Walk-in allowed only if paid in full. |
| `CustomerModule.tsx` | "Register Customer" Submit | `POST /api/v1/customers/` | `customers` | Permitted for all authenticated roles. Initial status defaults to `Active`. |
| `CustomerModule.tsx` | "Edit Customer" / "Toggle Status"| `PUT/PATCH /api/v1/customers/{id}/` or `POST /api/v1/customers/{id}/toggle-status/` | `customers` | Admin only (403 for cashiers). Updates customer profile and active state. |
| `CustomerModule.tsx` | "Record Payment" Modal | `POST /api/v1/payments/debt-payment/` | `payments` | Allocates payment FIFO to customer's oldest unpaid sales, reduces debt, posts `IN` to `AccountabilityTransaction`. |
| `PurchasesModule.tsx` | "New Purchase Order" Submit | `POST /api/v1/purchases/` | `purchases` | Admin only. Increments variant stock, logs stock movement, posts `OUT` to `AccountabilityTransaction`. |
| `AccountabilityModule.tsx`| "Add Expense" Modal | `POST /api/v1/accountability/expenses/` | `accountability`| Admin only. Creates `ManualExpense` and posts `OUT` movement to Cashbook ledger. |
| `ReportsModule.tsx` | Tab & Date filter change | `GET /api/v1/reports/{tab}/` | `reports` | Admin only. Read-only SQL aggregation across existing sales, purchases, and cashbook data. |
| `DashboardModule.tsx` | Period selector (Today/Month)| `GET /api/v1/dashboard/` | `dashboard` | Role-aware aggregation. Cashier receives operational summary (units, debtors, checkouts, stock health) with redacted gross profits. |
| `SettingsModule.tsx` | Save Pharmacy Settings Form| `PUT /api/v1/settings/` | `settings_app` | Admin only. Updates singleton configuration row. |

---

## 16. Frontend Redundancy Audit & Consolidation Directives

The existing frontend mock implementation contains several overlapping components and data structures that must be consolidated during backend API integration.

| Current Frontend Location | Duplicated / Redundant Function | Recommended Backend Domain Owner | Required Consolidation / Directive | Reason & Business Justification |
| :--- | :--- | :--- | :--- | :--- |
| `useKPIStats.ts` vs `useInventory.ts` | Duplicate calculation of inventory valuation and total units | `inventory` selector (`get_inventory_summary_kpis`) | Consolidate onto `GET /api/v1/inventory/summary-kpis/`. Remove duplicate math in frontend hooks. | Inventory valuation must be computed once at the database level (`current_stock * base_price`). |
| `CustomerModule.tsx` | Standalone debt tracking calculations inside UI state | `customers` selector (`get_customer_debt_ledger`) | Frontend must display `outstanding_debt` returned directly by backend API. | Debt is derived from `SUM(sales.outstanding_amount)`. Redundant client-side debt ledgers cause drift. |
| `salesService.ts` vs `reportService.ts` | Dual calculation of daily and monthly revenue and profit | `reports` selector (`get_sales_report`) | Single source of truth in `apps.reports.selectors`. | Historical profit must use `SaleItem` snapshot costs, never current catalog costs. |
| `mockRepository.ts` | Mock storage of batch numbers and expiry dates on variants | **OUT OF SCOPE** | Strip batch and expiry fields entirely from product APIs and schemas. | Approved scope explicitly excludes batch and expiry management for simplicity. |
| `Header.tsx` | Mock "Sync" and "Demo Reset" controls | `common` | Strip mock reset buttons in production build. Backend uses authentic MySQL database. | Avoid confusing staff with mock reset tools in production environment. |

---

## 17. Comprehensive Testing Strategy & Test Scenarios

The backend developer MUST implement thorough automated tests (`pytest-django`) before deploying any module.

```
alamaan_backend/tests/
├── accounts/
│   ├── test_registration.py
│   ├── test_approval_workflow.py
│   └── test_permissions.py
├── products/
│   ├── test_product_variants.py
│   └── test_price_history.py
├── inventory/
│   ├── test_stock_concurrency.py
│   └── test_stock_adjustments.py
├── sales/
│   ├── test_pos_checkout.py
│   ├── test_credit_sales.py
│   └── test_historical_price_integrity.py
├── payments/
│   └── test_debt_allocation.py
├── purchases/
│   └── test_stock_purchases.py
└── accountability/
    └── test_financial_ledger.py
```

### 17.1 Critical Test Case Specifications

1. **Pending Staff Access Rejection:**
   - User registers -> Attempts `POST /api/v1/auth/login/` -> Must receive `403 Forbidden` with error `ACCOUNT_PENDING_APPROVAL`.
2. **Admin-Only Approval Authority:**
   - Cashier attempts `POST /api/v1/users/{id}/approve/` -> Must receive `403 Forbidden`.
   - Admin attempts approval -> Must return `200 OK` and enable user login.
3. **Pessimistic Locking & Zero Stock Overselling:**
   - Product variant current stock = 2.
   - Two concurrent threads attempt to purchase 2 units each.
   - Exactly one thread must succeed; second thread must fail with `400 Bad Request` ("Insufficient stock"). Current stock must equal 0 (never -2).
4. **Historical Price Integrity & 4-Tier Pricing Validation:**
   - Product variant: `base_price` = ₦1,500, `min_selling_price` = ₦1,700, `default_selling_price` = ₦1,800, `max_selling_price` = ₦2,000.
   - Cashier attempts sale with `actual_selling_price` = ₦1,650 -> Must fail with `400 Bad Request` ("Selling price cannot be less than minimum allowable price ₦1,700").
   - Cashier attempts sale with `actual_selling_price` = ₦2,100 -> Must fail with `400 Bad Request` ("Selling price cannot exceed maximum allowable price ₦2,000").
   - Sale #1 completed with negotiated `actual_selling_price` = ₦1,750 for 2 units (Revenue = ₦3,500, Profit = (₦1,750 - ₦1,500) * 2 = ₦500).
   - Admin later updates variant: `base_price` = ₦1,600, `min_selling_price` = ₦1,800, `default_selling_price` = ₦1,900, `max_selling_price` = ₦2,200.
   - Re-fetch Sale #1 -> Line item `actual_selling_price` MUST remain ₦1,750 and `historical_base_price` MUST remain ₦1,500. Profit report for Sale #1 MUST remain ₦500.
5. **Credit Sale Validation:**
   - POS checkout with `amount_paid < total_amount` and `customer_id = null` -> Must fail with `400 Bad Request` ("Credit sales require a registered customer").
6. **FIFO Debt Allocation:**
   - Customer has Sale A (₦4,000 unpaid) and Sale B (₦6,000 unpaid). Total debt = ₦10,000.
   - Payment of ₦5,000 recorded.
   - Sale A outstanding must equal ₦0 (`PAID`). Sale B outstanding must equal ₦5,000 (`PARTIAL`). Customer total debt must equal ₦5,000.
7. **Single-Step Stock Purchase Synchronization:**
   - Restock purchase created for 50 units @ ₦300 (Total ₦15,000).
   - Variant stock must increase by exactly 50.
   - `InventoryMovement` must record `+50` (`STOCK_IN`).
   - `AccountabilityTransaction` must record `₦15,000` (`OUT`, `STOCK_PURCHASE`).

---

## 18. Environment Configuration & Production Readiness Checklist

### 18.1 Required Environment Variables (`.env`)
```bash
# Security
DJANGO_SECRET_KEY=django-insecure-prod-replace-with-64-char-random-string
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.alamaanpharmacy.com,127.0.0.1

# MySQL Database Connection
DB_NAME=alamaan_pharmacy_db
DB_USER=alamaan_user
DB_PASSWORD=SecurePassword123!
DB_HOST=127.0.0.1
DB_PORT=3306

# CORS & Frontend Origins
CORS_ALLOWED_ORIGINS=https://app.alamaanpharmacy.com,http://localhost:3000

# SimpleJWT Configuration
JWT_ACCESS_TOKEN_LIFETIME_MINUTES=60
JWT_REFRESH_TOKEN_LIFETIME_DAYS=7
JWT_SIGNING_KEY=jwt-secret-replace-in-production

# Media Storage
MEDIA_ROOT=/var/www/alamaan/media/
MEDIA_URL=/media/
```

### 18.2 Production Readiness Checklist
- [ ] `DEBUG = False` verified in `config/settings/production.py`.
- [ ] Database configured with `ENGINE: django.db.backends.mysql` and `CHARSET: utf8mb4`.
- [ ] Security headers enabled:
  - `SECURE_BROWSER_XSS_FILTER = True`
  - `SECURE_CONTENT_TYPE_NOSNIFF = True`
  - `X_FRAME_OPTIONS = 'DENY'`
  - `SECURE_SSL_REDIRECT = True` (in production behind NGINX/HTTPS)
  - `SESSION_COOKIE_SECURE = True`
  - `CSRF_COOKIE_SECURE = True`
- [ ] `django-cors-headers` restricted exclusively to approved frontend domain.
- [ ] Gunicorn WSGI server configured with 4 worker processes behind NGINX reverse proxy.
- [ ] Database backup cron job scheduled daily with off-site retention.
- [ ] Sentry error monitoring integrated for unhandled 500 exceptions.

---

## 19. Phase-by-Phase Backend Implementation Roadmap

```
PHASE 1: Project Foundation & Docker/MySQL Setup
   │
   ▼
PHASE 2: Accounts & JWT Authentication Engine
   │
   ▼
PHASE 3: Products, Categories & Multi-Company Variants
   │
   ▼
PHASE 4: Inventory Management & Stock Movement Ledger
   │
   ▼
PHASE 5: Customers & Credit Profile Subsystem
   │
   ▼
PHASE 6: Sales / POS Transaction Engine (with Price Snapshots)
   │
   ▼
PHASE 7: Customer Debt Recovery & FIFO Allocation
   │
   ▼
PHASE 8: Stock Restocking & Purchasing Workflow
   │
   ▼
PHASE 9: Central Financial Accountability Cashbook
   │
   ▼
PHASE 10: Read-Only Reports & SQL Aggregation Selectors
   │
   ▼
PHASE 11: Singleton System Settings & Receipt Engine
   │
   ▼
PHASE 12: Executive Dashboard KPIs & Analytics
   │
   ▼
PHASE 13: Frontend API Client Replacement (Axios / TanStack Query)
   │
   ▼
PHASE 14: End-to-End & Concurrency Stress Testing
   │
   ▼
PHASE 15: Security Hardening & Production Deployment
```

### Detailed Phase Deliverables

| Phase | Core Objective | Dependencies | Key Models Involved | Completion Criteria |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | Django 5.x project scaffolding, MySQL connection, Base Models | None | `TimeStampedModel`, `AuditableModel` | `python manage.py check` passes, DB connected |
| **Phase 2** | Custom User model, PENDING/ACTIVE workflow, JWT endpoints, RBAC | Phase 1 | `accounts.User` | Registration -> Admin approval -> Login test green. Cashier permission checks active. |
| **Phase 3** | Product catalog, Category, Company, ProductVariant | Phase 2 | `Category`, `Company`, `Product`, `ProductVariant` | Admin creates product with 2 company variants. Wholesale base costs redacted for cashiers. |
| **Phase 4** | Inventory ledger, stock audit trail, manual adjustments | Phase 3 | `InventoryMovement` | Adjust stock updates balance and logs movement (Admin-only adjustment). |
| **Phase 5** | Customer directory, 90-day inactivity evaluation, debt calculation selectors | Phase 2 | `customers.Customer` | Customer registered, walk-in NULL rule verified, 90-day inactivity auto-flagged. Customer editing/deactivation restricted to Admins. |
| **Phase 6** | POS checkout service, atomic stock deduction, price snapshots | Phases 3,4,5 | `Sale`, `SaleItem` | Cart checkout locks stock, records sale and movements across cashiers. |
| **Phase 7** | Debt payment service, FIFO debt settlement, receipt generation| Phase 6 | `CustomerDebtPayment` | Payment settles oldest sales, reduces customer balance (Cashiers & Admins permitted). |
| **Phase 8** | Inbound stock purchases, automatic stock increment (Admin restricted) | Phases 3,4 | `StockPurchase`, `PurchaseItem` | Purchase order restocks inventory in one atomic step (403 for cashiers). |
| **Phase 9** | Central financial cashbook, In/Out tracking, expenses (Admin restricted) | Phases 6,7,8 | `AccountabilityTransaction`, `ManualExpense`| All sales, payments, purchases post to ledger (403 for cashiers). |
| **Phase 10**| BI reporting endpoints (Sales, Profit, Inventory, Cashflow)| Phases 6,8,9 | *None (Read-Only)* | SQL aggregations match expected test numbers (Admin only). |
| **Phase 11**| System preferences singleton, custom receipt template | Phase 1 | `settings_app.SystemSettings`| Singleton row persists branding and rules (Admin-only write). |
| **Phase 12**| Role-aware dashboard (Executive KPIs for Admin; Operational KPIs for Cashier) | Phases 6,9,10| *None (Read-Only)* | Single API call supplies full dashboard cards tailored by role. |
| **Phase 13**| React frontend integration (Replace mock services with Axios, wire RoleGuards & headers)| All APIs | Frontend Services | Frontend features interact live with Django backend with strict route protection. |
| **Phase 14**| Automated test suite execution & concurrency validation | Phase 13 | All Apps | 100% critical test suite passes under pytest. |
| **Phase 15**| NGINX configuration, Gunicorn setup, HTTPS certificates | Phase 14 | Infrastructure | Live production environment accessible and secure. |

---

## 20. Final Architecture Summary & Risk Mitigation Matrix

### 20.1 Architecture Summary at a Glance
1. **Application Framework:** Django 5.x with Django REST Framework.
2. **Database Engine:** MySQL 8.x (InnoDB engine with row-level locking and strict foreign key constraints).
3. **Authentication Strategy:** `djangorestframework-simplejwt` issuing short-lived access tokens (60m) and rotating refresh tokens (7d). Manual admin approval gate enforced on `User.status == 'ACTIVE'`.
4. **Data Isolation Strategy:** Wholesale base prices, gross profits, and system configurations are structurally redacted from Cashier role responses via Serializer context inspection.
5. **Transactional Integrity:** State mutations spanning inventory, sales, customer debt, and financial movements execute exclusively inside atomic Service functions (`transaction.atomic`) with pessimistic row locking (`select_for_update`).
6. **Reporting Philosophy:** Reports and Dashboards never duplicate database records; they query existing transactional tables via optimized SQL `aggregate()` and `annotate()` selectors.

### 20.2 Risk Mitigation Matrix

| Architectural Risk | Potential Impact | Built-in Mitigation Strategy |
| :--- | :--- | :--- |
| **Race Conditions in Multi-Cashier POS Checkout** | Negative inventory, overselling products | Pessimistic locking via `select_for_update()` in `process_pos_sale()` service + DB level `CHECK (current_stock >= 0)` constraint. |
| **Historical Financial Audit Distortion** | Changing product prices alters past profit reports | `SaleItem` captures permanent snapshots of `actual_selling_price`, `historical_base_price`, `min_selling_price`, `default_selling_price`, and `max_selling_price` at the instant of sale. Historical sales are never recalculated with modern prices. |
| **Silent Financial Ledger Drift** | Inconsistent cash balances between sales and cashbook | Single atomic service creates `Sale` and `AccountabilityTransaction` together. If either fails, the entire transaction rolls back. |
| **Slow Dashboard & Reports on Large Datasets** | API timeouts, sluggish UI experience | Elimination of Python-level loops; use of targeted MySQL composite indexes and database-level SQL aggregations in `selectors.py`. |
| **Privilege Escalation by Malicious Client** | Cashier views wholesale cost or approves users | Enforcement of permissions at DRF view level (`IsAdminUserRole`) and field-level serializer redaction. Frontend security is treated as cosmetic only. |

---
**End of Official Django Backend Development Blueprint**  
*This document stands as the complete, authoritative specification for the Al-Amaan Pharmacy Management System backend implementation.*
