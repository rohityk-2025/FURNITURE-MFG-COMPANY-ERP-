-- ============================================================
-- WOODCRAFT FURNITURE ERP v4 — COMPLETE DATABASE SCHEMA
-- Compatible with frontend-v4 + backend-v4
-- 
-- Fresh install:
--   mysql -u root -p < schema_complete_v4.sql
--
-- After import, fix passwords:
--   cd backend && node run-this-first.js
-- ============================================================

CREATE DATABASE IF NOT EXISTS furniture_erp8
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE furniture_erp8;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS
  worker_payments, worker_advances, worker_attendance,
  calendar_events, company_details, product_images,
  order_items, orders, work_assignments,
  expenses, material_transactions,
  materials, customers, products, workers, users;
SET FOREIGN_KEY_CHECKS = 1;

-- ── USERS ─────────────────────────────────────────────────────────
CREATE TABLE users (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  email      VARCHAR(100) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       ENUM('ADMIN','MANAGER','ACCOUNTANT','WORKER','DELIVERY') NOT NULL DEFAULT 'MANAGER',
  phone      VARCHAR(20),
  is_active  TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── WORKERS ───────────────────────────────────────────────────────
CREATE TABLE workers (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  phone       VARCHAR(20),
  address     TEXT,
  skill       VARCHAR(100),
  worker_type ENUM('PERMANENT','CONTRACT') DEFAULT 'PERMANENT',
  salary_type ENUM('DAILY','WEEKLY','MONTHLY') DEFAULT 'DAILY',
  daily_rate  DECIMAL(10,2) DEFAULT 0,
  image_url   VARCHAR(500),
  is_active   TINYINT(1) DEFAULT 1,
  joined_date DATE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── PRODUCTS ──────────────────────────────────────────────────────
CREATE TABLE products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  category    VARCHAR(50),
  description TEXT,
  price       DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission  DECIMAL(10,2) DEFAULT 0,
  hsn_code    VARCHAR(20),
  cgst_pct    DECIMAL(5,2) DEFAULT 9.00,
  sgst_pct    DECIMAL(5,2) DEFAULT 9.00,
  unit        VARCHAR(20) DEFAULT 'Pcs.',
  tags        TEXT,
  is_active   TINYINT(1) DEFAULT 1,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── PRODUCT IMAGES ────────────────────────────────────────────────
CREATE TABLE product_images (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url  VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── MATERIALS ─────────────────────────────────────────────────────
CREATE TABLE materials (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  unit         VARCHAR(30) NOT NULL DEFAULT 'pcs',
  quantity     INT DEFAULT 0,
  min_stock    INT DEFAULT 0,
  unit_price   DECIMAL(10,2) DEFAULT 0,
  vendor_name  VARCHAR(100),
  vendor_phone VARCHAR(20),
  notes        TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── MATERIAL TRANSACTIONS ─────────────────────────────────────────
CREATE TABLE material_transactions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  material_id INT NOT NULL,
  type        ENUM('IN','OUT') NOT NULL,
  quantity    INT NOT NULL,
  unit_price  DECIMAL(10,2) DEFAULT 0,
  vendor_name VARCHAR(100),
  notes       TEXT,
  created_by  INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_id) REFERENCES materials(id),
  FOREIGN KEY (created_by)  REFERENCES users(id)
);

-- ── CUSTOMERS ─────────────────────────────────────────────────────
CREATE TABLE customers (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  phone      VARCHAR(20),
  email      VARCHAR(100),
  address    TEXT,
  gst_number VARCHAR(50),
  image_url  VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── ORDERS ────────────────────────────────────────────────────────
CREATE TABLE orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  order_number     VARCHAR(20) NOT NULL UNIQUE,
  customer_id      INT NOT NULL,
  status           ENUM('PENDING','IN_PRODUCTION','READY','YET_TO_DELIVER','DELIVERED','CANCELLED') DEFAULT 'PENDING',
  order_date       DATE NOT NULL,
  delivery_date    DATE,
  subtotal         DECIMAL(10,2) DEFAULT 0,
  cgst             DECIMAL(10,2) DEFAULT 0,
  sgst             DECIMAL(10,2) DEFAULT 0,
  igst             DECIMAL(10,2) DEFAULT 0,
  delivery_charges DECIMAL(10,2) DEFAULT 0,
  other_charges    DECIMAL(10,2) DEFAULT 0,
  discount         DECIMAL(10,2) DEFAULT 0,
  total_amount     DECIMAL(10,2) DEFAULT 0,
  payment_status   ENUM('UNPAID','PARTIAL','PAID') DEFAULT 'UNPAID',
  payment_mode     ENUM('CASH','UPI','NEFT','CARD','CHEQUE','OTHER') DEFAULT 'CASH',
  amount_paid      DECIMAL(10,2) DEFAULT 0,
  lr_number        VARCHAR(100),
  transport_name   VARCHAR(100),
  vehicle_number   VARCHAR(50),
  notes            TEXT,
  created_by       INT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by)  REFERENCES users(id)
);

-- ── ORDER ITEMS ───────────────────────────────────────────────────
CREATE TABLE order_items (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  order_id            INT NOT NULL,
  product_id          INT,
  custom_product_name VARCHAR(100),
  quantity            INT NOT NULL DEFAULT 1,
  unit                VARCHAR(20) DEFAULT 'Pcs.',
  unit_price          DECIMAL(10,2) NOT NULL,
  cgst_pct            DECIMAL(5,2) DEFAULT 0,
  sgst_pct            DECIMAL(5,2) DEFAULT 0,
  igst_pct            DECIMAL(5,2) DEFAULT 0,
  hsn_code            VARCHAR(20),
  total_price         DECIMAL(10,2) NOT NULL,
  notes               TEXT,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

-- ── WORK ASSIGNMENTS ──────────────────────────────────────────────
CREATE TABLE work_assignments (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  worker_id           INT NOT NULL,
  product_id          INT,
  custom_product_name VARCHAR(100),
  quantity            INT NOT NULL DEFAULT 1,
  commission          DECIMAL(10,2) DEFAULT 0,
  status              ENUM('ASSIGNED','IN_PROGRESS','COMPLETED') DEFAULT 'ASSIGNED',
  due_date            DATE,
  completed_date      DATE,
  is_paid             TINYINT(1) DEFAULT 0,
  paid_amount         DECIMAL(10,2) DEFAULT 0,
  paid_date           DATE,
  notes               TEXT,
  assigned_by         INT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id)   REFERENCES workers(id),
  FOREIGN KEY (product_id)  REFERENCES products(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id)
);

-- ── EXPENSES ──────────────────────────────────────────────────────
CREATE TABLE expenses (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  category     ENUM('MATERIAL','SALARY','UTILITIES','TRANSPORT','MAINTENANCE','RENT','OTHER') DEFAULT 'OTHER',
  amount       DECIMAL(10,2) NOT NULL,
  tax_pct      DECIMAL(5,2) DEFAULT NULL,
  tax_amount   DECIMAL(10,2) DEFAULT NULL,
  vendor_name  VARCHAR(100),
  vendor_gst   VARCHAR(50),
  description  TEXT,
  notes        TEXT,
  date         DATE NOT NULL,
  is_active    TINYINT(1) DEFAULT 1,
  created_by   INT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ── WORKER PAYMENTS ───────────────────────────────────────────────
CREATE TABLE worker_payments (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  worker_id          INT NOT NULL,
  work_assignment_id INT,
  amount             DECIMAL(10,2) NOT NULL,
  payment_date       DATE NOT NULL,
  payment_type       ENUM('FULL','PARTIAL','ADVANCE') DEFAULT 'FULL',
  advance_deducted   DECIMAL(10,2) DEFAULT 0,
  notes              TEXT,
  created_by         INT,
  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id)          REFERENCES workers(id),
  FOREIGN KEY (work_assignment_id) REFERENCES work_assignments(id),
  FOREIGN KEY (created_by)         REFERENCES users(id)
);

-- ── WORKER ADVANCES ───────────────────────────────────────────────
CREATE TABLE worker_advances (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  worker_id    INT NOT NULL,
  amount       DECIMAL(10,2) NOT NULL,
  remaining    DECIMAL(10,2) NOT NULL,
  note         TEXT,
  payment_date DATE NOT NULL,
  created_by   INT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (worker_id)  REFERENCES workers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ── WORKER ATTENDANCE ─────────────────────────────────────────────
CREATE TABLE worker_attendance (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  worker_id  INT NOT NULL,
  date       DATE NOT NULL,
  status     ENUM('PRESENT','ABSENT','HALF_DAY','HOLIDAY','WORKOFF') DEFAULT 'PRESENT',
  notes      TEXT,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance (worker_id, date),
  FOREIGN KEY (worker_id)  REFERENCES workers(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ── CALENDAR EVENTS ───────────────────────────────────────────────
CREATE TABLE calendar_events (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  event_date   DATE NOT NULL,
  event_type   ENUM('DELIVERY','TODO','MEETING','HOLIDAY','OTHER') DEFAULT 'TODO',
  reminder     TINYINT(1) DEFAULT 0,
  reminder_days INT DEFAULT 1,
  order_id     INT,
  created_by   INT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id)   REFERENCES orders(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ── COMPANY DETAILS ───────────────────────────────────────────────
CREATE TABLE company_details (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  company_name   VARCHAR(200) DEFAULT 'WoodCraft Furniture',
  tagline        VARCHAR(200),
  gst_number     VARCHAR(50),
  pan_number     VARCHAR(20),
  address        TEXT,
  city           VARCHAR(100),
  state          VARCHAR(100),
  pincode        VARCHAR(10),
  phone          VARCHAR(50),
  email          VARCHAR(100),
  website        VARCHAR(200),
  logo_url       VARCHAR(500),
  qr_url         VARCHAR(500),
  extra_info     VARCHAR(500),
  upi_id         VARCHAR(100),
  upi_phone      VARCHAR(20),
  bank_name      VARCHAR(100),
  bank_account   VARCHAR(50),
  bank_ifsc      VARCHAR(20),
  bank_branch    VARCHAR(100),
  invoice_prefix VARCHAR(20) DEFAULT 'WC',
  invoice_terms  TEXT,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- USERS
-- Default password for BOTH accounts: admin123
-- If login fails run: cd backend && node run-this-first.js
INSERT INTO users (name, email, password, role, is_active) VALUES
('Admin User',
 'admin@furnitureerp.com',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
 'ADMIN', 1),
('Manager One',
 'manager@furnitureerp.com',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
 'MANAGER', 1);

-- COMPANY
INSERT INTO company_details (
  id, company_name, tagline, address, city, state, phone, email,
  invoice_prefix, invoice_terms
) VALUES (
  1, 'WoodCraft Furniture', 'Quality Furniture Manufacturers',
  'Shop No. 1, Industrial Area', 'Pune', 'Maharashtra',
  '9876543210', 'info@woodcraft.com', 'WC',
  'Goods once sold will not be taken back or exchanged\nSubject to local jurisdiction\nPayment due within 30 days'
);

-- PRODUCTS
INSERT INTO products (name, category, price, commission, cgst_pct, sgst_pct, unit) VALUES
('Wooden Chair',      'Seating',  2500,  500, 9, 9, 'Pcs.'),
('Dining Table',      'Tables',   8000,  800, 9, 9, 'Pcs.'),
('Sofa Set (3+1+1)',  'Seating', 35000, 2000, 9, 9, 'Set'),
('Double Bed',        'Bedroom', 18000, 1200, 9, 9, 'Pcs.'),
('Wardrobe (3 Door)', 'Bedroom', 22000, 1500, 9, 9, 'Pcs.'),
('Coffee Table',      'Tables',   4500,  400, 9, 9, 'Pcs.'),
('Office Chair',      'Seating',  5500,  600, 9, 9, 'Pcs.'),
('Bookshelf',         'Storage',  6000,  500, 9, 9, 'Pcs.');

-- MATERIALS
INSERT INTO materials (name, unit, quantity, min_stock, unit_price, vendor_name) VALUES
('Plywood (18mm)', 'sheets', 150, 20, 850,  'Sharma Timber'),
('Plywood (12mm)', 'sheets',  80, 15, 650,  'Sharma Timber'),
('Nails (Box)',    'box',     50, 10, 120,  'Hardware Hub'),
('Screws (100pcs)','box',     40, 10,  85,  'Hardware Hub'),
('Wood Polish',    'liters',  25,  5, 350,  'Paint Palace'),
('Fabric (mtr)',   'meters', 200, 30, 280,  'Textile World'),
('Foam (2 inch)',  'sheets',  60, 10, 450,  'Foam Zone'),
('Wood Glue',      'liters',  20,  5, 220,  'Hardware Hub'),
('Sandpaper',      'pack',    30,  8,  95,  'Hardware Hub'),
('Hinges (pair)',  'pairs',  100, 20,  45,  'Hardware Hub');

-- CUSTOMERS
INSERT INTO customers (name, phone, email, address) VALUES
('Sunshine Furniture',  '9876543210', 'sunshine@email.com', 'MG Road, Pune'),
('Royal Interiors',     '9765432109', 'royal@email.com',    'Kothrud, Pune'),
('Modern Home Decor',   '9654321098', 'modern@email.com',   'Baner, Pune'),
('Classic Furnishings', '9543210987', 'classic@email.com',  'Wakad, Pune'),
('Elite Living',        '9432109876', 'elite@email.com',    'Viman Nagar, Pune');

-- WORKERS
INSERT INTO workers (name, phone, skill, worker_type, salary_type, daily_rate, joined_date) VALUES
('Ramesh Kumar',  '9876512345', 'Carpentry',  'PERMANENT', 'DAILY', 600, '2023-01-15'),
('Suresh Patil',  '9765123456', 'Polishing',  'PERMANENT', 'DAILY', 500, '2023-03-20'),
('Mahesh Jadhav', '9654234567', 'Upholstery', 'CONTRACT',  'DAILY', 650, '2022-11-10'),
('Rajesh Sharma', '9543345678', 'Carpentry',  'PERMANENT', 'DAILY', 600, '2023-06-05'),
('Dinesh More',   '9432456789', 'Assembly',   'CONTRACT',  'DAILY', 550, '2024-01-20');
