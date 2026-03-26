# WoodCraft Furniture ERP + Website

A full-stack enterprise resource planning system built for small-to-medium furniture manufacturing businesses. Includes a complete ERP dashboard for internal operations and a separate public-facing website for customer engagement.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [Backend API Architecture](#6-backend-api-architecture)
7. [Frontend Architecture](#7-frontend-architecture)
8. [User Roles and Access Control](#8-user-roles-and-access-control)
9. [Core Modules — ERP](#9-core-modules--erp)
10. [GST Module](#10-gst-module)
11. [Public Website](#11-public-website)
12. [Authentication and Security](#12-authentication-and-security)
13. [OOP and Design Concepts Applied](#13-oop-and-design-concepts-applied)
14. [Setup and Installation](#14-setup-and-installation)
15. [Environment Variables](#15-environment-variables)
16. [API Reference Summary](#16-api-reference-summary)
17. [Key Business Logic](#17-key-business-logic)
18. [Deployment Notes](#18-deployment-notes)

---

## 1. Project Overview

WoodCraft ERP is built to solve the real operational challenges of a furniture manufacturing business:

- **Order management** with GST-compliant invoicing (CGST/SGST/IGST)
- **Worker and attendance** tracking with salary calculation
- **Inventory and materials** tracking with stock alerts
- **Finance and advance management** for worker payments
- **GST compliance** — Output GST, Input GST (ITC), GSTR-1, GSTR-3B
- **Public website** with admin-controlled product catalog and deals
- **Role-based access** — Admins and Managers with separate dashboards

The system is intentionally kept simple and practical, avoiding unnecessary complexity while maintaining professional-grade functionality suitable for real business use.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   ┌─────────────────────┐     ┌─────────────────────────────┐  │
│   │   ERP Dashboard     │     │    Public Website           │  │
│   │   (React + Vite)    │     │    (React + Vite)           │  │
│   │   Port: 5173        │     │    Port: 3001               │  │
│   │                     │     │                             │  │
│   │  Admin Panel        │     │  Home, Products, About,     │  │
│   │  Manager Panel      │     │  Contact, Wishlist, Login   │  │
│   └─────────┬───────────┘     └──────────────┬──────────────┘  │
│             │                                │                  │
└─────────────┼────────────────────────────────┼──────────────────┘
              │  HTTP / REST API               │
              │  JWT Bearer Token              │
              ▼                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       API LAYER                                 │
│                                                                 │
│              Node.js + Express.js                               │
│              Port: 5000                                         │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │  Auth    │  │  Orders  │  │   GST    │  │   Website    │   │
│  │Middleware│  │  Route   │  │  Route   │  │   Route      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │
│                                                                 │
│  18 Route modules — each handling one domain of business logic  │
└─────────────────────────────────────────────────────────────────┘
              │
              │  Sequelize ORM + Raw SQL
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                 │
│                                                                 │
│              MySQL 8.x Database                                 │
│              23 Tables                                          │
│                                                                 │
│  Core ERP Tables        GST/Finance Tables    Website Tables    │
│  ─────────────────       ────────────────      ─────────────    │
│  users                  expenses              website_products  │
│  workers                order_items           website_deals     │
│  products               company_details       website_settings  │
│  materials              worker_payments                         │
│  customers              worker_advances                         │
│  orders                 worker_attendance                       │
│  work_assignments       calendar_events                         │
│  product_images         material_transactions                   │
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decisions:**

- The ERP and public website share a single backend API, reducing infrastructure cost.
- Website data (products, deals) is stored in completely separate tables from ERP operational data. Changes in the website catalog do not affect ERP inventory, orders, or finances.
- All authentication uses stateless JWT tokens stored in `localStorage`, keeping the backend horizontally scalable.
- Raw SQL is used alongside Sequelize ORM for complex queries (GST summaries, dashboard aggregations) where query performance matters.

---

## 3. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | JavaScript runtime |
| Express.js | 4.x | HTTP server and routing |
| Sequelize | 6.x | ORM for MySQL connection pooling |
| MySQL2 | 3.x | MySQL driver |
| bcryptjs | 2.x | Password hashing (cost factor 10) |
| jsonwebtoken | 9.x | JWT generation and verification |
| multer | 1.x | Multipart file uploads for images |
| dotenv | 17.x | Environment variable loading |
| cors | 2.x | Cross-origin request headers |

### Frontend (ERP)
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | Component-based UI |
| Vite | 5 | Build tool and dev server |
| React Router DOM | 6 | Client-side routing |
| Axios | 1.x | HTTP client with interceptors |
| Recharts | 2.x | Charts and data visualization |
| Tailwind CSS | 3.x | Utility classes (minimal use) |
| CSS Variables | — | Theming for dark/light mode |

### Frontend (Website)
| Technology | Version | Purpose |
|---|---|---|
| React | 18 | Component-based UI |
| Vite | 5 | Build tool |
| React Router DOM | 6 | Client-side routing |
| Axios | 1.x | HTTP calls to shared backend |

### Database
| Technology | Purpose |
|---|---|
| MySQL 8.x | Primary relational database |
| JSON columns | Product images array, offer checkboxes |
| DECIMAL(10,2) | All financial values for precision |
| ENUM types | Status fields with constrained values |
| Timestamps | `created_at`, `updated_at` on all tables |

---

## 4. Project Structure

```
woodcraft-erp/
│
├── backend/                        # Express.js API server
│   ├── config/
│   │   └── database.js             # Sequelize connection + pool config
│   ├── middleware/
│   │   └── auth.js                 # JWT verification, role guards
│   ├── routes/                     # One file per business domain
│   │   ├── auth.js                 # Login, /me token validation
│   │   ├── users.js                # Manager accounts CRUD
│   │   ├── workers.js              # Worker management + image upload
│   │   ├── products.js             # Product catalog + image upload
│   │   ├── materials.js            # Raw material inventory
│   │   ├── customers.js            # Customer CRM
│   │   ├── orders.js               # Sales orders + invoice serial numbers
│   │   ├── workAssignments.js      # Job assignments to workers
│   │   ├── finance.js              # Worker payments + advances
│   │   ├── expenses.js             # Business expenses with tax
│   │   ├── attendance.js           # Daily and monthly attendance
│   │   ├── dashboard.js            # Aggregated KPI data
│   │   ├── reports.js              # Report data (6 types)
│   │   ├── gst.js                  # GST module (Output/Input/GSTR-1)
│   │   ├── company.js              # Company settings + logo
│   │   ├── calendar.js             # Events and delivery reminders
│   │   ├── search.js               # Global search across tables
│   │   └── website.js              # Public website content API
│   ├── uploads/                    # Multer file storage
│   │   ├── products/               # Product images
│   │   ├── workers/                # Worker profile photos
│   │   └── company/                # Logo and QR code
│   ├── run-this-first.js           # Fixes bcrypt hashes on first run
│   ├── server.js                   # App entry point, route mounting
│   ├── package.json
│   └── .env                        # Secrets (not in git)
│
├── frontend/                       # ERP React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui.jsx              # All reusable UI primitives
│   │   │   ├── Navbar.jsx          # Top navigation bar
│   │   │   ├── AdminLayout.jsx     # Admin sidebar + layout
│   │   │   └── ManagerLayout.jsx   # Manager sidebar + layout
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # User auth state (React Context)
│   │   │   └── ThemeContext.jsx    # Dark/light mode state
│   │   ├── pages/
│   │   │   ├── admin/              # 15 admin-only pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Orders.jsx
│   │   │   │   ├── Products.jsx
│   │   │   │   ├── Workers.jsx
│   │   │   │   ├── Finance.jsx
│   │   │   │   ├── Expenses.jsx
│   │   │   │   ├── GST.jsx
│   │   │   │   ├── Website.jsx     # Website content management
│   │   │   │   └── ...
│   │   │   ├── manager/            # 10 manager pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── Orders.jsx
│   │   │   │   ├── AssignWork.jsx
│   │   │   │   └── ...
│   │   │   └── Login.jsx
│   │   ├── utils/
│   │   │   ├── api.js              # Axios instance with auth interceptor
│   │   │   └── invoice.js          # GST invoice HTML generator
│   │   ├── App.jsx                 # Router + route guards
│   │   ├── index.css               # CSS variables + global styles
│   │   └── main.jsx
│   └── package.json
│
├── website/                        # Public website React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Fixed navigation with scroll effect
│   │   │   └── Footer.jsx          # Footer with social media icons
│   │   ├── pages/
│   │   │   ├── Home.jsx            # All homepage sections
│   │   │   ├── Products.jsx        # Product listing + filters
│   │   │   ├── ProductDetail.jsx   # Single product page
│   │   │   ├── Wishlist.jsx        # localStorage-based saved items
│   │   │   ├── About.jsx           # Brand story, testimonials
│   │   │   ├── Contact.jsx         # Contact form
│   │   │   └── Login.jsx           # ERP login (redirects by role)
│   │   ├── utils/
│   │   │   └── data.js             # API fetch, static content, helpers
│   │   ├── App.jsx                 # Routes + data loading
│   │   ├── index.css               # Premium brand CSS variables
│   │   └── main.jsx
│   └── package.json
│
├── database_gst_migration.sql      # Adds GST columns to existing DB
├── database_website_migration.sql  # Creates website tables
└── README.md
```

---

## 5. Database Design

### Design Principles

The database follows **third normal form (3NF)** to eliminate redundancy. Financial values always use `DECIMAL(10,2)` to avoid floating-point precision errors. All tables include `created_at` and `updated_at` timestamps automatically managed by MySQL. Soft deletion (`is_active = 0`) is used instead of hard deletes to preserve data integrity and audit trails.

### Core ERP Tables

#### `users`
Stores all ERP accounts. Role-based access is enforced at the API middleware level using the `role` ENUM.

```sql
users (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  email        VARCHAR(100) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,          -- bcrypt hash, never plaintext
  role         ENUM('ADMIN','MANAGER','ACCOUNTANT','WORKER','DELIVERY'),
  phone        VARCHAR(20),
  is_active    TINYINT(1) DEFAULT 1,           -- soft deactivation
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP ... ON UPDATE CURRENT_TIMESTAMP
)
```

#### `workers`
Production floor workers, separate from system users. Tracks salary type, daily rate, and profile image.

```sql
workers (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  phone        VARCHAR(20),
  skill        VARCHAR(100),                   -- e.g. Carpentry, Polishing
  worker_type  ENUM('PERMANENT','CONTRACT'),
  salary_type  ENUM('DAILY','WEEKLY','MONTHLY'),
  daily_rate   DECIMAL(10,2) DEFAULT 0,
  image_url    VARCHAR(500),                   -- stored in /uploads/workers/
  is_active    TINYINT(1) DEFAULT 1,
  joined_date  DATE,
  ...
)
```

#### `products`
ERP product catalog used for order items. Completely separate from website products.

```sql
products (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  category     VARCHAR(50),
  price        DECIMAL(10,2) NOT NULL,
  commission   DECIMAL(10,2) DEFAULT 0,        -- per-unit worker commission
  hsn_code     VARCHAR(20),                    -- GST HSN code
  cgst_pct     DECIMAL(5,2) DEFAULT 9.00,
  sgst_pct     DECIMAL(5,2) DEFAULT 9.00,
  igst_pct     DECIMAL(5,2) DEFAULT 0.00,
  material_list TEXT,                          -- bill of materials
  material_cost DECIMAL(10,2) DEFAULT 0,       -- for gross profit calculation
  unit         VARCHAR(20) DEFAULT 'Pcs.',
  is_active    TINYINT(1) DEFAULT 1,
  ...
)
```

#### `orders` and `order_items`
The orders table uses a serial invoice number format `{PREFIX}-{MM}{YY}-{SERIAL}` (e.g. `WC-0425-0001`). GST is computed and stored separately as CGST, SGST, and IGST columns, enabling direct use in GSTR filings.

```sql
orders (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  order_number      VARCHAR(30) UNIQUE NOT NULL,  -- WC-0425-0001
  customer_id       INT REFERENCES customers(id),
  status            ENUM('PENDING','IN_PRODUCTION','READY','YET_TO_DELIVER','DELIVERED','CANCELLED'),
  order_date        DATE NOT NULL,
  subtotal          DECIMAL(10,2),
  cgst              DECIMAL(10,2) DEFAULT 0,      -- computed, stored for GST reports
  sgst              DECIMAL(10,2) DEFAULT 0,
  igst              DECIMAL(10,2) DEFAULT 0,
  discount          DECIMAL(10,2) DEFAULT 0,
  delivery_charges  DECIMAL(10,2) DEFAULT 0,
  total_amount      DECIMAL(10,2),
  payment_status    ENUM('UNPAID','PARTIAL','PAID'),
  amount_paid       DECIMAL(10,2) DEFAULT 0,
  payment_mode      ENUM('CASH','UPI','NEFT','CARD','CHEQUE','OTHER'),
  ...
)

order_items (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  order_id     INT REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INT REFERENCES products(id),
  custom_product_name  VARCHAR(100),            -- when not from catalog
  quantity     INT NOT NULL,
  unit_price   DECIMAL(10,2) NOT NULL,
  cgst_pct     DECIMAL(5,2) DEFAULT 0,
  sgst_pct     DECIMAL(5,2) DEFAULT 0,
  igst_pct     DECIMAL(5,2) DEFAULT 0,
  hsn_code     VARCHAR(20),
  total_price  DECIMAL(10,2) NOT NULL
)
```

The `ON DELETE CASCADE` on `order_items` means when an order is deleted, all its line items are automatically removed, maintaining referential integrity.

#### `work_assignments`
Links workers to production jobs. Tracks completion status and partial payment through `paid_amount`.

```sql
work_assignments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  worker_id    INT REFERENCES workers(id),
  product_id   INT REFERENCES products(id),
  quantity     INT DEFAULT 1,
  commission   DECIMAL(10,2) DEFAULT 0,       -- per-unit rate
  status       ENUM('ASSIGNED','IN_PROGRESS','COMPLETED'),
  is_paid      TINYINT(1) DEFAULT 0,
  paid_amount  DECIMAL(10,2) DEFAULT 0,       -- allows partial payments
  paid_date    DATE,
  ...
)
```

#### `expenses`
All business expenses except worker salary payments (those are in `worker_payments`). The `tax_amount` field stores the GST paid on the expense — this becomes Input Tax Credit (ITC).

```sql
expenses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  category     ENUM('MATERIAL','UTILITIES','TRANSPORT','MAINTENANCE','RENT','OTHER'),
  amount       DECIMAL(10,2) NOT NULL,        -- final amount INCLUDING tax
  tax_pct      DECIMAL(5,2),                  -- e.g. 18.00 for 18% GST
  tax_amount   DECIMAL(10,2),                 -- calculated tax portion (ITC)
  vendor_name  VARCHAR(100),
  vendor_gst   VARCHAR(50),                   -- vendor's GSTIN for ITC claim
  date         DATE NOT NULL,
  is_active    TINYINT(1) DEFAULT 1,          -- soft delete
  created_by   INT REFERENCES users(id),
  ...
)
```

#### `worker_attendance`
Uses a unique constraint on `(worker_id, date)` to prevent duplicate attendance entries. Supports upsert via `ON DUPLICATE KEY UPDATE`.

```sql
worker_attendance (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  worker_id    INT REFERENCES workers(id),
  date         DATE NOT NULL,
  status       ENUM('PRESENT','ABSENT','HALF_DAY','HOLIDAY','WORKOFF'),
  UNIQUE KEY   uq_attendance (worker_id, date)   -- prevents duplicates
)
```

#### `worker_advances`
Tracks cash advances given to workers. The `remaining` column is decremented when the worker returns money, tracked through the Finance page.

```sql
worker_advances (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  worker_id    INT REFERENCES workers(id),
  amount       DECIMAL(10,2) NOT NULL,        -- original advance amount
  remaining    DECIMAL(10,2) NOT NULL,        -- what worker still owes
  note         TEXT,
  payment_date DATE NOT NULL
)
```

### Website Tables (Separate Domain)

These tables are completely isolated from ERP tables. No foreign keys cross the ERP/website boundary. This means admin can freely delete a product from the website catalog without affecting any orders or inventory.

```sql
website_products (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  category      VARCHAR(100),
  price         DECIMAL(10,2),
  dashed_price  DECIMAL(10,2),               -- MRP / crossed-out price
  discount_pct  INT DEFAULT 0,               -- auto-calculated from prices
  tag           VARCHAR(50),                  -- Bestseller, New, Limited etc.
  image_urls    JSON,                         -- array of image URLs
  offers        JSON,                         -- array of offer strings
  is_active     TINYINT(1) DEFAULT 1
)

website_settings (
  id            INT PRIMARY KEY DEFAULT 1,   -- singleton row
  tagline       VARCHAR(200),
  facebook_url  VARCHAR(300),
  instagram_url VARCHAR(300),
  youtube_url   VARCHAR(300),
  linkedin_url  VARCHAR(300),
  whatsapp_number VARCHAR(20)
)

website_deals (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  subtitle      VARCHAR(300),
  discount_text VARCHAR(100),
  is_active     TINYINT(1) DEFAULT 1
)
```

### Entity Relationship Summary

```
users ──────────────────┐
  1:M                   │ created_by
workers ──────────────────────────── work_assignments ──── products
  1:M (attendance)                         1:M (payments)
  1:M (advances)

customers ──── orders ──── order_items ──── products
                  (1:M)         (M:1)

orders ──── calendar_events (delivery reminders)

materials ──── material_transactions (stock in/out)

company_details ◄── website_settings (one-to-one conceptually)
website_products  (no FK to ERP products — separate domain)
```

---

## 6. Backend API Architecture

### Server Entry Point (`server.js`)

The entry point mounts all 18 route modules onto `/api/*` prefixes and serves static file uploads. Connection is verified before the server starts listening.

```javascript
// Route mounting pattern — one module per business domain
app.use('/api/auth',             require('./routes/auth'))
app.use('/api/orders',           require('./routes/orders'))
app.use('/api/gst',              require('./routes/gst'))
app.use('/api/website',          require('./routes/website'))
// ... 14 more routes

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))
```

### Middleware Layer (`middleware/auth.js`)

Two middleware functions guard every protected route. This is the single enforcement point for authentication and authorization.

```javascript
// auth — verifies JWT token from Authorization: Bearer <token> header
const auth = (req, res, next) => {
  const token = req.headers['authorization']?.slice(7)
  req.user = jwt.verify(token, SECRET)   // throws on invalid/expired
  next()
}

// adminOnly — applied AFTER auth, checks role
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin only' })
  next()
}

// Usage in route files:
router.delete('/:id', auth, adminOnly, async (req, res) => { ... })
```

### Dynamic Column Detection Pattern

Because the project supports both old and new database schemas (users may not have run all migrations), routes use `INFORMATION_SCHEMA.COLUMNS` to check which columns exist before building INSERT/UPDATE queries. This prevents crashes on schema mismatches.

```javascript
// Example from orders.js
const [cols] = await sequelize.query(
  `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders'`
)
const has = (c) => cols.map(x => x.COLUMN_NAME).includes(c)

const fields = ['order_number', 'customer_id', 'subtotal']
const vals   = [num, custId, sub]
if (has('cgst')) { fields.push('cgst'); vals.push(cgstV) }
if (has('igst')) { fields.push('igst'); vals.push(igstV) }

await sequelize.query(
  `INSERT INTO orders(${fields.join(',')}) VALUES(${fields.map(() => '?').join(',')})`,
  { replacements: vals }
)
```

### File Upload Pattern (`multer`)

Worker and product image uploads use `multer` with disk storage. Each route file that handles uploads defines its own storage destination and applies the middleware directly to the relevant POST/PUT handlers.

```javascript
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `w_${Date.now()}${path.extname(file.originalname)}`)
})
const upload = multer({ storage, limits: { fileSize: 3 * 1024 * 1024 } })

// Applied to specific routes only
router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
  // req.body contains form fields parsed by multer
  // req.file contains the uploaded file info
})
```

---

## 7. Frontend Architecture

### API Utility (`utils/api.js`)

A single Axios instance is created with a base URL and a request interceptor that automatically attaches the JWT token from `localStorage` to every request. This means no component ever needs to handle auth headers manually.

```javascript
const api = axios.create({ baseURL: '/api' })

// Interceptor adds Authorization header to every request automatically
api.interceptors.request.use(config => {
  const token = localStorage.getItem('erp_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})
```

### Context Pattern

Two React Contexts manage global application state:

**AuthContext** — Stores the logged-in user object and provides `login()`, `logout()`, and `refreshUser()` methods. The initial state is read from `localStorage` so the user stays logged in after browser refresh.

**ThemeContext** — Manages the `dark` boolean, persisted in `localStorage`. The dark class is applied to `document.documentElement`, and all colors use CSS variables that change based on the class.

### CSS Variable Theming

All colors are defined as CSS variables in `index.css` with separate values for `:root` (light mode) and `.dark` (dark mode). No Tailwind color classes are used for colors.

```css
:root {
  --bg:      #f8fafc;
  --card:    #ffffff;
  --text:    #1e293b;
  --primary: #2563eb;
  --red:     #dc2626;
  --green:   #16a34a;
}

.dark {
  --bg:      #0a0f1e;
  --card:    #111827;
  --text:    #f1f5f9;
  --primary: #3b82f6;
  --red:     #f87171;
  --green:   #22c55e;
}
```

Components use these variables in inline styles:

```jsx
<div style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
```

### Route Guards

The `Guard` component in `App.jsx` protects routes. It reads the user from `AuthContext` and redirects to `/login` if not authenticated, or redirects non-admins away from admin routes.

```jsx
function Guard({ adminOnly, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/manager" replace />
  return children
}
```

### Reusable UI Components (`components/ui.jsx`)

All shared UI primitives live in a single file to keep the component API consistent and easy to maintain. Key components:

| Component | Purpose |
|---|---|
| `Modal` | Centered overlay modal, always positioned at top of viewport |
| `ConfirmDialog` | Destructive action confirmation with loading state |
| `LoadingPage` | Full-page centered spinner |
| `EmptyState` | No-data placeholder with icon, title, and action button |
| `StatusBadge` | Color-coded status chip (maps ENUM values to styles) |
| `SearchBar` | Debounced search input with icon |
| `Tabs` | Pill-style tab switcher |
| `ToastProvider` | Toast notification system (context + auto-dismiss) |
| `useToast` | Hook for triggering toasts from any component |
| `fmt` | Currency formatter — always displays in INR with commas |
| `fmtDate` | Date formatter in dd Mon yyyy style |

---

## 8. User Roles and Access Control

The system implements **Role-Based Access Control (RBAC)** at three layers:

### Layer 1 — Database
Passwords are stored as bcrypt hashes with cost factor 10 (never plaintext). Sensitive tables are never exposed directly.

### Layer 2 — API Middleware
Every API route is protected by the `auth` middleware. Routes that modify sensitive data additionally require `adminOnly`. This is enforced server-side and cannot be bypassed from the frontend.

### Layer 3 — Frontend Routing
The `Guard` component prevents non-admin users from accessing admin URLs in the browser. Even if a manager manually navigates to `/admin/workers`, they are redirected to `/manager`.

### Role Capabilities

| Capability | Admin | Manager |
|---|---|---|
| View all orders | Yes | Yes |
| Create / edit orders | Yes | Yes |
| Print GST invoices | Yes | Yes |
| Add / edit products | Yes | No |
| Add / edit workers | Yes | No |
| View finance / payments | Yes | No |
| Manage GST module | Yes | No |
| Manage website content | Yes | No |
| Manage company settings | Yes | No |
| Create/deactivate other users | Yes | No |
| View reports | Yes | Yes |
| Mark attendance | Yes | Yes |
| Assign work | Yes | Yes |
| Add expenses | Yes | Yes |
| Cannot deactivate own account | Enforced | N/A |

### Self-Protection Rule (Users Module)

A specific business rule prevents an admin from accidentally locking themselves out. In both the backend (`users.js` route) and the frontend (`Managers.jsx`), the system checks `targetId === requesterId` before allowing deactivation.

```javascript
// Backend enforcement — cannot be bypassed
if (targetId === req.user.id && is_active === 0) {
  return res.status(403).json({
    error: 'You cannot deactivate your own account. Ask another admin.'
  })
}
```

---

## 9. Core Modules — ERP

### Orders Module

The most complex module. Handles the full order lifecycle from creation to delivery.

**Invoice Serial Number Generation:**

Format: `{COMPANY_INITIALS}-{MM}{YY}-{SERIAL}` — for example `WC-0425-0001`.

The serial is generated by querying the last order with the same prefix and month, then incrementing. This ensures sequential numbering even after deletions.

```javascript
async function genOrderNumber() {
  const [co] = await sequelize.query('SELECT invoice_prefix FROM company_details WHERE id=1')
  const prefix = co[0]?.invoice_prefix || 'WC'
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(2)
  const base = `${prefix}-${mm}${yy}-`

  const [last] = await sequelize.query(
    'SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1',
    { replacements: [`${base}%`] }
  )
  const serial = last.length ? parseInt(last[0].order_number.split('-').pop()) + 1 : 1
  return `${base}${String(serial).padStart(4, '0')}`
}
```

**GST Calculation Logic:**

Tax is calculated line-by-line on each item, applying discount proportionally across items before computing tax on the taxable amount.

```javascript
function calculateOrderAmounts(items, discount) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const discountAmount = Math.min(discount, subtotal)

  let cgst = 0, sgst = 0, igst = 0

  items.forEach((item, index) => {
    // Proportional discount allocation per line
    const lineSubtotal = item.quantity * item.unit_price
    const lineDiscount = discountAmount * (lineSubtotal / subtotal)
    const taxable = lineSubtotal - lineDiscount

    cgst += taxable * item.cgst_pct / 100
    sgst += taxable * item.sgst_pct / 100
    igst += taxable * item.igst_pct / 100
  })

  return { subtotal, cgst, sgst, igst, total: subtotal - discountAmount + cgst + sgst + igst }
}
```

**CGST+SGST vs IGST Rule:**

Intrastate transactions use CGST + SGST (split equally). Interstate transactions use IGST only. The product form enforces this with a toggle — setting IGST to any value resets CGST and SGST to zero, and vice versa.

### Finance Module

Handles worker payment tracking with partial payment support.

**Partial Payment Logic:**

When a job is paid partially, `paid_amount` is recorded on the `work_assignments` table and `is_paid` remains 0. The Finance page calculates `remaining = (commission × quantity) - paid_amount` and shows it in red. Multiple partial payments accumulate.

**Advance Management:**

Worker advances are tracked with an `amount` (original) and `remaining` (what is owed back). When a worker repays part of the advance, the admin edits the `remaining` value down.

### Attendance Module

Uses MySQL's `ON DUPLICATE KEY UPDATE` for upsert — marking attendance for a worker on a date either creates a new record or updates the existing one, preventing duplicate entries.

```sql
INSERT INTO worker_attendance(worker_id, date, status)
VALUES(?, ?, ?)
ON DUPLICATE KEY UPDATE status = VALUES(status)
```

The monthly salary sheet computes:

```
Effective Days = Present Days + (Half Days × 0.5)
Monthly Salary = Effective Days × Daily Rate
```

### Expense Tax Calculation

The expense form clearly separates pre-tax amount from tax amount. The final saved value is the total including tax.

```javascript
// On form submit — final amount includes tax
const pretax = parseFloat(form.amount) || 0
const taxAmt = parseFloat(form.tax_amount) || 0
submitting.amount = (pretax + taxAmt).toFixed(2)  // stored amount is inclusive
```

Example: Material costing Rs. 1000 with 18% GST → saved as Rs. 1180. The `tax_amount` column stores Rs. 180, which is the ITC claimable.

---

## 10. GST Module

### How Indian GST Works (Implemented Logic)

GST in India has two forms:
- **Intrastate** (within same state): CGST (9%) + SGST (9%) = 18% total
- **Interstate** (across states): IGST (18%) only

**Output GST** = Tax collected from customers on sales

**Input GST (ITC)** = Tax paid to vendors on purchases (from expenses with tax)

**Net GST Payable** = Output GST − Input GST (ITC)

If ITC > Output GST, the excess is carried forward to the next month.

### GST Dashboard Calculation

```javascript
// Output GST — from non-cancelled orders in the period
SELECT SUM(cgst) + SUM(sgst) + SUM(igst) as output_gst
FROM orders
WHERE order_date BETWEEN ? AND ?
  AND status NOT IN ('CANCELLED')

// Input GST — from expenses with tax, excluding salary
SELECT SUM(tax_amount) as input_gst
FROM expenses
WHERE date BETWEEN ? AND ?
  AND category != 'SALARY'
  AND COALESCE(is_active, 1) = 1

// Net payable
net_payable = MAX(0, output_gst - input_gst)
itc_carry_forward = MAX(0, input_gst - output_gst)
```

### GSTR-1 Data Structure

GSTR-1 (monthly outward supply return) separates orders into:

- **B2B** — Customers with a registered GSTIN. Reportable with buyer GSTIN.
- **B2C** — Customers without GSTIN. Reportable as aggregate.

The system generates both a human-readable Excel/CSV and a machine-readable JSON in the simplified GSTR-1 format for upload to the GST portal.

### Output GST Editability

Each order row in the Output GST table is individually editable by clicking "Edit". This allows a Chartered Accountant to make corrections before filing — for example, adjusting rounding differences or correcting a rate applied to a custom item. Changes save to the `cgst`, `sgst`, `igst` columns on the orders table and recalculate the total.

---

## 11. Public Website

### Data Separation Architecture

The website reads from `website_products`, `website_deals`, and `website_settings` tables. These are entirely separate from the ERP's `products`, `expenses`, and `orders` tables.

```
Admin adds product to ERP (products table)    ← ERP only
Admin adds product to Website (website_products) ← Website only
```

This separation means:
- Deleting a product from the website never affects open orders
- ERP product pricing can differ from website display pricing
- The website can show discontinued items or special web-only prices

### Public API Endpoint

A single unauthenticated endpoint provides everything the website needs:

```
GET /api/website/public
Response: {
  company:     { name, logo, address, phone, email, gst_number },
  websiteData: { tagline, hero_subtitle, social links, whatsapp },
  products:    [ array of website_products ],
  deals:       [ array of active website_deals ]
}
```

### Wishlist (localStorage)

The website wishlist uses `localStorage` with key `sunshine_wishlist`. No server storage or account required. Products are stored as full objects so the wishlist works offline and survives page refreshes.

```javascript
const toggle = (product) => {
  const list = JSON.parse(localStorage.getItem('sunshine_wishlist') || '[]')
  const exists = list.some(p => p.id === product.id)
  const next = exists ? list.filter(p => p.id !== product.id) : [...list, product]
  localStorage.setItem('sunshine_wishlist', JSON.stringify(next))
}
```

### WhatsApp Enquiry

The product detail page has an "Enquire Now" button that opens a pre-filled WhatsApp message. The phone number comes from `website_settings.whatsapp_number`, configurable by the admin.

```javascript
const message = `Hello! I am interested in ${product.title} (Rs. ${product.price})`
window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`)
```

---

## 12. Authentication and Security

### JWT Token Flow

```
1. User submits email + password to POST /api/auth/login
2. Backend compares password against bcrypt hash in DB
3. On success, signs a JWT payload { id, name, email, role }
   with 7-day expiry
4. Token returned to frontend and stored in localStorage
5. Every subsequent request includes: Authorization: Bearer <token>
6. auth middleware verifies signature and expiry on every request
7. req.user is populated with the decoded payload
```

### Password Security

Passwords are hashed using bcrypt with cost factor 10. This means each hash computation takes approximately 100ms on modern hardware, making brute-force attacks computationally expensive.

```javascript
const hash = await bcrypt.hash(password, 10)  // 10 = cost factor
const ok   = await bcrypt.compare(plaintext, hash)
```

### What Is Not Stored

- Plaintext passwords never touch the database
- The JWT secret is in `.env` and not committed to version control
- User session state is entirely client-side (stateless backend)

---

## 13. OOP and Design Concepts Applied

Although JavaScript is not a classical OOP language, the codebase applies several important software design principles:

### Single Responsibility Principle (SRP)

Every file has one job. Route files handle only their domain. The `ui.jsx` file provides only presentational components. `api.js` only configures the HTTP client.

```
auth.js      — authentication only
workers.js   — worker CRUD only
gst.js       — GST calculations only
invoice.js   — invoice HTML generation only
```

### Separation of Concerns (SoC)

The system is divided into distinct layers with clear boundaries:

- **Data layer** — MySQL tables, accessed only through route files
- **Business logic layer** — Route handlers with calculation logic
- **Presentation layer** — React components, knows nothing about SQL
- **API contract layer** — JSON responses with consistent shape

### Provider Pattern (React Context)

`AuthContext` and `ThemeContext` implement the Provider pattern — a form of the Observer pattern. Multiple components subscribe to the same state without prop drilling.

```jsx
// Provider wraps the entire app
<AuthProvider>
  <ThemeProvider>
    <App />
  </ThemeProvider>
</AuthProvider>

// Any component can consume without prop passing
const { user, logout } = useAuth()
const { dark, toggle } = useTheme()
```

### Factory Pattern (Route Handlers)

Route files act as handler factories. Each route file exports a configured Express Router — an object pre-loaded with its handlers, middleware, and domain logic.

```javascript
// factory in workers.js
const router = express.Router()
router.get('/',    auth, getAll)
router.post('/',   auth, adminOnly, upload.single('image'), create)
router.put('/:id', auth, adminOnly, upload.single('image'), update)
module.exports = router  // fully configured object
```

### Strategy Pattern (Tax Calculation)

The order form uses a strategy-like pattern for CGST/SGST vs IGST. Setting one tax mode resets the other to zero — the system switches between two calculation strategies based on user selection.

```javascript
// CGST+SGST strategy
if (k === 'cgst_pct' || k === 'sgst_pct') {
  next.igst_pct = '0'
}
// IGST strategy
if (k === 'igst_pct' && val !== '0') {
  next.cgst_pct = '0'
  next.sgst_pct = '0'
}
```

### Repository Pattern (API Utility)

The `api.js` Axios instance acts as a repository — abstracting all HTTP communication details from components. Components call `api.get('/orders')` without knowing about base URLs, auth headers, or error formats.

### Template Method Pattern (Invoice Generator)

`invoice.js` implements a template method — it defines the structure of a GST invoice (header, items table, tax summary, bank details) while filling in values from the order data passed to it.

### Soft Delete Pattern

Instead of hard-deleting records, the system sets `is_active = 0`. This:
- Preserves referential integrity (orders still reference deleted products)
- Maintains audit history
- Allows easy restoration
- Prevents orphan record errors

### Observer / Pub-Sub Pattern (Toast System)

The `ToastProvider` and `useToast` hook implement a lightweight pub-sub system. Any component can publish a toast notification. The provider listens and renders the notification layer globally.

```javascript
// Publisher — any component
const toast = useToast()
toast('Order saved successfully')
toast('Failed to connect', 'error')

// Subscriber — ToastProvider renders notifications
```

---

## 14. Setup and Installation

### Prerequisites

- Node.js 18 or higher
- MySQL 8.x
- npm 9 or higher

### Step 1 — Database Setup

```bash
# Create the database and tables
mysql -u root -p < schema_complete_v4.sql

# Run migrations for new features
mysql -u root -p furniture_erp < database_gst_migration.sql
mysql -u root -p furniture_erp < database_website_migration.sql
```

### Step 2 — Backend

```bash
cd backend
npm install

# Fix initial password hashes (run once)
node run-this-first.js

# Start development server
npm run dev
# Server runs at http://localhost:5000
```

### Step 3 — ERP Frontend

```bash
cd frontend
npm install
npm run dev
# Runs at http://localhost:5173
```

### Step 4 — Public Website (optional)

```bash
cd website
npm install
npm run dev
# Runs at http://localhost:3001
```

### Default Login Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@furnitureerp.com | admin123 |
| Manager | manager@furnitureerp.com | admin123 |

**Change these immediately after first login.**

---

## 15. Environment Variables

Create a `.env` file inside the `backend/` directory:

```env
# Database connection
DB_HOST=localhost
DB_NAME=furniture_erp
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT secret — use a long random string in production
JWT_SECRET=your_super_secret_jwt_key_change_this

# Server port
PORT=5000
```

**Never commit `.env` to version control.** The `.env.example` file shows required variables without values.

---

## 16. API Reference Summary

All routes prefixed with `/api`. Protected routes require `Authorization: Bearer <token>` header.

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | None | Email + password login, returns JWT |
| GET | `/auth/me` | Yes | Verify token, returns user info |

### Orders
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/orders` | Yes | List orders with filters |
| GET | `/orders/:id` | Yes | Single order with items |
| POST | `/orders` | Yes | Create order, auto-generate serial number |
| PUT | `/orders/:id` | Yes | Update order and items |

### GST
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/gst/summary` | Yes | Monthly GST dashboard data |
| GET | `/gst/output` | Yes | Output GST orders list |
| PUT | `/gst/output/:id` | Admin | Edit order GST values |
| GET | `/gst/input` | Yes | Input GST expenses list |
| GET | `/gst/gstr1` | Yes | GSTR-1 B2B and B2C data |

### Website (Public)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/website/public` | None | All public website data |
| GET | `/website` | Admin | Admin view of website data |
| PUT | `/website/settings` | Admin | Update settings and socials |
| POST | `/website/products` | Admin | Add website product |
| PUT | `/website/products/:id` | Admin | Update website product |
| DELETE | `/website/products/:id` | Admin | Soft-delete website product |
| POST | `/website/deals` | Admin | Add deal/offer |

### Workers
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/workers` | Yes | List with attendance count |
| POST | `/workers` | Admin | Create worker (with image) |
| PUT | `/workers/:id` | Admin | Update worker (with image) |
| POST | `/workers/upload-image` | Admin | Upload profile photo |

### Users
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users` | Admin | List all users |
| POST | `/users` | Admin | Create user |
| PUT | `/users/:id` | Admin | Edit user (name, email, password) |
| DELETE | `/users/:id` | Admin | Deactivate user (not self) |
| POST | `/users/:id/activate` | Admin | Reactivate user |

---

## 17. Key Business Logic

### Order Lifecycle

```
PENDING → IN_PRODUCTION → READY → YET_TO_DELIVER → DELIVERED
                                                  ↘ CANCELLED
```

Payment status transitions independently:
```
UNPAID → PARTIAL → PAID
```

### Gross Profit Calculation

```
Gross Profit per Product = Selling Price − Material Cost
Net Profit (Period) = Total Revenue − Total Expenses
```

Material cost is stored per product (`products.material_cost`) and used in the Profit/Loss report.

### Salary Sheet Formula

```
Effective Days = (PRESENT days) + (HALF_DAY days × 0.5)
Monthly Salary = Effective Days × Daily Rate
```

Workers on `MONTHLY` salary type have a fixed rate regardless of attendance (payroll handled separately).

### Invoice Discount Allocation

When a discount is applied to an order, it is distributed proportionally across all line items before GST is computed. This ensures the correct taxable value per item.

```javascript
const lineDiscount = totalDiscount × (lineSubtotal / orderSubtotal)
const taxableLineAmount = lineSubtotal - lineDiscount
const lineCGST = taxableLineAmount × (cgst_pct / 100)
```

### Expense Tax (ITC Eligible Amount)

```
Amount Before Tax (entered by user)  =  Rs. 1000
Tax Rate                             =  18%
Tax Amount (auto-calculated)         =  Rs. 180
Final Stored Amount                  =  Rs. 1180

ITC Claimable = Tax Amount = Rs. 180
```

The `tax_amount` column on each expense record represents the ITC claimable, which is summed in the GST Input module.

---

## 18. Deployment Notes

### Production Build

```bash
# ERP Frontend
cd frontend && npm run build    # output: frontend/dist/

# Website Frontend
cd website && npm run build     # output: website/dist/

# Backend (no build step needed)
cd backend && npm start
```

### Serving Both Apps from Backend

In production, the Express backend can serve both built frontends as static files:

```javascript
// Serve ERP app
app.use('/erp', express.static(path.join(__dirname, '../frontend/dist')))
app.get('/erp/*', (req, res) => res.sendFile(path.join(__dirname, '../frontend/dist/index.html')))

// Serve public website at root
app.use('/', express.static(path.join(__dirname, '../website/dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '../website/dist/index.html')))
```

### Security Checklist Before Going Live

- [ ] Change `JWT_SECRET` in `.env` to a long random string (minimum 64 characters)
- [ ] Change all default passwords (admin, manager accounts)
- [ ] Set `DB_PASSWORD` to a strong password
- [ ] Enable HTTPS (use Nginx or a reverse proxy with SSL certificate)
- [ ] Restrict CORS origin in `server.js` to your actual domain
- [ ] Move `uploads/` directory to a cloud storage service (S3, Cloudinary) for production
- [ ] Set up MySQL backups on a scheduled basis
- [ ] Remove or protect the `/api/health` endpoint in production

### Nginx Configuration Example

```nginx
server {
    listen 443 ssl;
    server_name yourcompany.com;

    # Public website
    location / {
        root /var/www/website/dist;
        try_files $uri $uri/ /index.html;
    }

    # ERP app
    location /erp/ {
        root /var/www/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API backend
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # File uploads
    location /uploads/ {
        root /var/www/backend;
        expires 30d;
    }
}
```

---

## Summary

WoodCraft ERP is a complete business management system that covers the full operational lifecycle of a furniture manufacturing company — from taking orders and assigning production work, to tracking attendance, calculating GST, generating compliant invoices, and showcasing products on a premium public website.

The architecture prioritizes:

1. **Simplicity** — Each file has one clear purpose. No unnecessary abstractions.
2. **Reliability** — Dynamic column detection prevents schema-mismatch crashes. Soft deletes preserve data integrity.
3. **Correctness** — Financial calculations use `DECIMAL` types and proportional discount allocation. GST logic follows actual Indian tax rules.
4. **Separation** — Website data never mixes with ERP operational data. Auth is enforced at the API layer, not just the UI.
5. **Maintainability** — CSS variables centralize theming. Shared UI components ensure visual consistency. One Axios instance handles all HTTP communication.

---

*Generated for WoodCraft Furniture ERP v7 — Built with Node.js, React, MySQL*
