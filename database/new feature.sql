-- Run this if you already have the database and want to ADD new columns only
-- (Don't run schema.sql again as it will drop all data)
USE furniture_erp;

-- Workers new columns
ALTER TABLE workers 
  ADD COLUMN  worker_type ENUM('PERMANENT','CONTRACT') DEFAULT 'PERMANENT',
  ADD COLUMN  salary_type ENUM('DAILY','WEEKLY','MONTHLY') DEFAULT 'DAILY',
  ADD COLUMN  image_url VARCHAR(500) DEFAULT NULL;

-- Products new columns  
ALTER TABLE products
  ADD COLUMN  hsn_code VARCHAR(20) DEFAULT NULL,
  ADD COLUMN  cgst_pct DECIMAL(5,2) DEFAULT 9,
  ADD COLUMN  sgst_pct DECIMAL(5,2) DEFAULT 9,
  ADD COLUMN  unit VARCHAR(20) DEFAULT 'Pcs.',
  ADD COLUMN  tags TEXT DEFAULT NULL;

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Orders new columns
ALTER TABLE orders
  ADD COLUMN cgst DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN sgst DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN igst DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN payment_mode ENUM('CASH','UPI','NEFT','CARD','CHEQUE','OTHER') DEFAULT 'CASH',
  ADD COLUMN lr_number VARCHAR(100) DEFAULT NULL,
  ADD COLUMN transport_name VARCHAR(100) DEFAULT NULL,
  ADD COLUMN vehicle_number VARCHAR(50) DEFAULT NULL;

-- Order items new columns
ALTER TABLE order_items
  ADD COLUMN  unit VARCHAR(20) DEFAULT 'Pcs.',
  ADD COLUMN  cgst_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN  sgst_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN  igst_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN  hsn_code VARCHAR(20) DEFAULT NULL;

-- Expenses new columns
ALTER TABLE expenses
  ADD COLUMN  tax_pct DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN  tax_amount DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN  vendor_name VARCHAR(100) DEFAULT NULL,
  ADD COLUMN  vendor_gst VARCHAR(50) DEFAULT NULL,
  ADD COLUMN  description TEXT DEFAULT NULL,
  ADD COLUMN  bill_image_url VARCHAR(500) DEFAULT NULL,
  MODIFY COLUMN category ENUM('MATERIAL','SALARY','UTILITIES','TRANSPORT','MAINTENANCE','RENT','OTHER') DEFAULT 'OTHER';

-- Attendance new statuses
ALTER TABLE worker_attendance
  MODIFY COLUMN status ENUM('PRESENT','ABSENT','HALF_DAY','HOLIDAY','WORKOFF') DEFAULT 'PRESENT';

-- Company new columns
ALTER TABLE company_details
  ADD COLUMN logo_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN qr_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN bank_branch VARCHAR(100) DEFAULT NULL,
  ADD COLUMN extra_info VARCHAR(500) DEFAULT NULL;

-- Users new roles
ALTER TABLE users
  MODIFY COLUMN role ENUM('ADMIN','MANAGER','ACCOUNTANT','WORKER','DELIVERY') NOT NULL DEFAULT 'MANAGER';

-- Work assignments
ALTER TABLE work_assignments
  ADD COLUMN    paid_amount DECIMAL(10,2) DEFAULT 0;

SELECT 'Migration complete!' as status;


-- Run this in MySQL to fix all "Unknown column" errors
-- mysql -u root -p furniture_erp < fix_missing_columns.sql

USE furniture_erp;

-- ── calendar_events ───────────────────────────────────────────────
ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS reminder_days INT DEFAULT 1;

-- ── expenses ─────────────────────────────────────────────────────
-- The new backend inserts 'notes' but old table had different columns
-- Add all missing expense columns
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_pct DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vendor_name VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vendor_gst VARCHAR(50) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bill_image_url VARCHAR(500) DEFAULT NULL;

-- Also update category ENUM to include new values
ALTER TABLE expenses MODIFY COLUMN category 
  ENUM('MATERIAL','SALARY','UTILITIES','TRANSPORT','MAINTENANCE','RENT','OTHER') DEFAULT 'OTHER';

-- ── workers ───────────────────────────────────────────────────────
ALTER TABLE workers
  ADD COLUMN IF NOT EXISTS worker_type ENUM('PERMANENT','CONTRACT') DEFAULT 'PERMANENT',
  ADD COLUMN IF NOT EXISTS salary_type ENUM('DAILY','WEEKLY','MONTHLY') DEFAULT 'DAILY',
  ADD COLUMN IF NOT EXISTS image_url VARCHAR(500) DEFAULT NULL;

-- ── products ─────────────────────────────────────────────────────
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cgst_pct DECIMAL(5,2) DEFAULT 9,
  ADD COLUMN IF NOT EXISTS sgst_pct DECIMAL(5,2) DEFAULT 9,
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'Pcs.',
  ADD COLUMN IF NOT EXISTS tags TEXT DEFAULT NULL;

-- Product images table
CREATE TABLE IF NOT EXISTS product_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ── orders ───────────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cgst DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_mode ENUM('CASH','UPI','NEFT','CARD','CHEQUE','OTHER') DEFAULT 'CASH',
  ADD COLUMN IF NOT EXISTS lr_number VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS transport_name VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(50) DEFAULT NULL;

-- ── order_items ───────────────────────────────────────────────────
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit VARCHAR(20) DEFAULT 'Pcs.',
  ADD COLUMN IF NOT EXISTS cgst_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sgst_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS igst_pct DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20) DEFAULT NULL;

-- ── work_assignments ─────────────────────────────────────────────
ALTER TABLE work_assignments
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- ── attendance ────────────────────────────────────────────────────
ALTER TABLE worker_attendance MODIFY COLUMN status 
  ENUM('PRESENT','ABSENT','HALF_DAY','HOLIDAY','WORKOFF') DEFAULT 'PRESENT';

-- ── company_details ───────────────────────────────────────────────
ALTER TABLE company_details
  ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS qr_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS extra_info VARCHAR(500) DEFAULT NULL;

-- ── users ─────────────────────────────────────────────────────────
ALTER TABLE users MODIFY COLUMN role 
  ENUM('ADMIN','MANAGER','ACCOUNTANT','WORKER','DELIVERY') NOT NULL DEFAULT 'MANAGER';

SELECT 'All columns fixed successfully!' AS status;
