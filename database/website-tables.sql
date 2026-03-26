-- ============================================================
-- WEBSITE FEATURE TABLES + MIGRATIONS
-- Run this in MySQL Workbench against furniture_erp7.
-- Safe to run multiple times — uses IF NOT EXISTS / IF EXISTS.
-- ============================================================

USE furniture_erp7;

-- ------------------------------------------------------------
-- 1. website_info  (key-value store)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_info (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  key_name   VARCHAR(100) NOT NULL UNIQUE,
  key_value  TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. website_products  (fresh create or migrate old schema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_products (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  description    TEXT,
  price          DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_price DECIMAL(12,2)          DEFAULT 0,
  category       VARCHAR(100),
  tag            VARCHAR(50),
  material       VARCHAR(255),
  brand          VARCHAR(100),
  dimensions     VARCHAR(255),
  weight         VARCHAR(100),
  room_type      VARCHAR(100),
  offers         TEXT,
  image_urls     TEXT,
  sort_order     INT          NOT NULL DEFAULT 0,
  is_active      TINYINT      NOT NULL DEFAULT 1,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Migrate old column names → new names (safe: errors ignored if already done)
ALTER TABLE website_products CHANGE COLUMN dashed_price   original_price DECIMAL(12,2) DEFAULT 0;
ALTER TABLE website_products CHANGE COLUMN materials_used material       VARCHAR(255);
ALTER TABLE website_products DROP COLUMN IF EXISTS discount_pct;

-- Add any missing columns (safe if already exist — wrap in procedure)
ALTER TABLE website_products ADD COLUMN IF NOT EXISTS description    TEXT          AFTER title;
ALTER TABLE website_products ADD COLUMN IF NOT EXISTS original_price DECIMAL(12,2) DEFAULT 0 AFTER price;
ALTER TABLE website_products ADD COLUMN IF NOT EXISTS material       VARCHAR(255)  AFTER tag;
ALTER TABLE website_products ADD COLUMN IF NOT EXISTS brand          VARCHAR(100)  AFTER material;
ALTER TABLE website_products ADD COLUMN IF NOT EXISTS dimensions     VARCHAR(255)  AFTER brand;
ALTER TABLE website_products ADD COLUMN IF NOT EXISTS weight         VARCHAR(100)  AFTER dimensions;
ALTER TABLE website_products ADD COLUMN IF NOT EXISTS room_type      VARCHAR(100)  AFTER weight;

-- ------------------------------------------------------------
-- 3. website_deals  (fresh create or migrate old schema)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_deals (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  subtitle    VARCHAR(255),
  description TEXT,
  bg_color    VARCHAR(20)  NOT NULL DEFAULT '#2C2420',
  text_color  VARCHAR(20)  NOT NULL DEFAULT '#E8C97A',
  cta_text    VARCHAR(100) NOT NULL DEFAULT 'Shop Now',
  is_active   TINYINT      NOT NULL DEFAULT 1,
  sort_order  INT          NOT NULL DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to old deals table
ALTER TABLE website_deals ADD COLUMN IF NOT EXISTS bg_color    VARCHAR(20)  NOT NULL DEFAULT '#2C2420';
ALTER TABLE website_deals ADD COLUMN IF NOT EXISTS text_color  VARCHAR(20)  NOT NULL DEFAULT '#E8C97A';
ALTER TABLE website_deals ADD COLUMN IF NOT EXISTS cta_text    VARCHAR(100) NOT NULL DEFAULT 'Shop Now';
ALTER TABLE website_deals ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE website_deals DROP COLUMN IF EXISTS discount_text;

-- ------------------------------------------------------------
-- 4. website_speciality  (ordered featured products)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS website_speciality (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  website_product_id INT NOT NULL,
  sort_order         INT NOT NULL DEFAULT 0,
  FOREIGN KEY (website_product_id)
    REFERENCES website_products(id)
    ON DELETE CASCADE
);

-- ============================================================
-- VERIFY: SHOW TABLES LIKE 'website_%';
-- DESCRIBE website_products;
-- DESCRIBE website_deals;
-- ============================================================
