-- ═══════════════════════════════════════════════════════════════════════════════
-- NexaRats Pro — Complete Database Setup
-- Generated from backend codebase analysis (all services, controllers, types)
-- Run this ONCE in Supabase SQL Editor to create everything from scratch.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── CLEANUP: Drop everything in reverse FK order ────────────────────────────
DROP TABLE IF EXISTS store_sessions      CASCADE;
DROP TABLE IF EXISTS store_wishlist      CASCADE;
DROP TABLE IF EXISTS store_addresses     CASCADE;
DROP TABLE IF EXISTS store_customers     CASCADE;
DROP TABLE IF EXISTS otp_codes           CASCADE;
DROP TABLE IF EXISTS whatsapp_messages   CASCADE;
DROP TABLE IF EXISTS invoice_items       CASCADE;
DROP TABLE IF EXISTS purchase_orders     CASCADE;
DROP TABLE IF EXISTS transactions        CASCADE;
DROP TABLE IF EXISTS settings            CASCADE;
DROP TABLE IF EXISTS vendors             CASCADE;
DROP TABLE IF EXISTS customers           CASCADE;
DROP TABLE IF EXISTS products            CASCADE;
DROP TABLE IF EXISTS admin_users         CASCADE;
DROP FUNCTION IF EXISTS process_sale     CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_auth CASCADE;

-- ─── Enable pgcrypto for gen_random_uuid() and crypt() ──────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 1: admin_users
-- Used by: user.service.ts (login, getAll, create, update, delete)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'Manager',
  status      TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  permissions JSONB NOT NULL DEFAULT '{}',
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_admin_users_email ON admin_users(email);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 2: products
-- Used by: product.service.ts, sale.service.ts (stock validation + RPC)
-- Columns mapped from: mapProduct() in product.service.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  sku                 TEXT UNIQUE NOT NULL,
  category            TEXT NOT NULL,
  price               NUMERIC(12,2) NOT NULL,
  purchase_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  mrp                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock               INTEGER NOT NULL DEFAULT 0,
  min_stock           INTEGER NOT NULL DEFAULT 5,
  status              TEXT NOT NULL DEFAULT 'In Stock'
    CHECK (status IN ('In Stock','Low Stock','Out of Stock')),
  gst_rate            NUMERIC(5,2) NOT NULL DEFAULT 18,
  tax_type            TEXT NOT NULL DEFAULT 'Inclusive'
    CHECK (tax_type IN ('Inclusive','Exclusive')),
  unit                TEXT NOT NULL DEFAULT 'Pieces',
  image               TEXT,
  expiry_date         DATE,
  returns             TEXT DEFAULT 'Returnable'
    CHECK (returns IN ('Returnable','Not Returnable')),
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  hsn_code            TEXT,
  description         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status ON products(status);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 3: customers
-- Used by: customer.service.ts, sale.service.ts
-- Columns mapped from: mapCustomer() in customer.service.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE customers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  email            TEXT,
  phone            TEXT NOT NULL,
  total_paid       NUMERIC(12,2) DEFAULT 0,
  pending          NUMERIC(12,2) DEFAULT 0,
  status           TEXT DEFAULT 'Paid'
    CHECK (status IN ('Paid','Unpaid','Partial')),
  last_transaction DATE,
  total_invoices   INTEGER DEFAULT 0,
  address          TEXT,
  channel          TEXT DEFAULT 'offline'
    CHECK (channel IN ('offline','online','both')),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_phone ON customers(phone);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 4: vendors
-- Used by: vendor.service.ts, purchase.service.ts
-- Columns mapped from: mapVendor() in vendor.service.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE vendors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  business_name    TEXT NOT NULL,
  gst_number       TEXT,
  phone            TEXT NOT NULL,
  email            TEXT,
  total_paid       NUMERIC(12,2) DEFAULT 0,
  pending_amount   NUMERIC(12,2) DEFAULT 0,
  last_transaction DATE,
  total_invoices   INTEGER DEFAULT 0,
  image            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 5: transactions
-- Used by: transaction.service.ts, sale.service.ts (via RPC), store-orders
-- Columns mapped from: mapTransaction() in transaction.service.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  subtotal        NUMERIC(12,2) NOT NULL,
  gst_amount      NUMERIC(12,2) NOT NULL,
  total           NUMERIC(12,2) NOT NULL,
  paid_amount     NUMERIC(12,2) NOT NULL,
  method          TEXT NOT NULL
    CHECK (method IN ('cash','upi','card','split','bank_transfer')),
  status          TEXT NOT NULL DEFAULT 'Paid'
    CHECK (status IN ('Paid','Unpaid','Partial')),
  source          TEXT NOT NULL DEFAULT 'offline'
    CHECK (source IN ('offline','online')),
  order_status    TEXT
    CHECK (order_status IN ('Pending','Confirmed','Shipped','Delivered','Cancelled')),
  assigned_staff  TEXT,
  delivery_status TEXT,
  date            DATE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transactions_customer ON transactions(customer_id);
CREATE INDEX idx_transactions_source ON transactions(source);
CREATE INDEX idx_transactions_date ON transactions(date);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 6: invoice_items
-- Used by: transaction.service.ts (join), sale.service.ts (via RPC)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE invoice_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name   TEXT NOT NULL,
  quantity       INTEGER NOT NULL,
  price          NUMERIC(12,2) NOT NULL,
  gst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(12,2) DEFAULT 0
);
CREATE INDEX idx_invoice_items_tx ON invoice_items(transaction_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 7: purchase_orders
-- Used by: purchase.service.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE purchase_orders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  amount     NUMERIC(12,2) NOT NULL,
  date       DATE NOT NULL,
  status     TEXT DEFAULT 'Paid'
    CHECK (status IN ('Paid','Unpaid','Partial')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_purchase_orders_vendor ON purchase_orders(vendor_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 8: store_customers  (Online storefront shoppers)
-- Used by: store-auth.service.ts, store-profile, store-orders
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE store_customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  phone        TEXT UNIQUE NOT NULL,
  email        TEXT,
  password     TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent  NUMERIC(12,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_store_customers_phone ON store_customers(phone);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 9: store_addresses
-- Used by: store-profile.controller.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE store_addresses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  line1       TEXT NOT NULL,
  line2       TEXT,
  city        TEXT NOT NULL,
  state       TEXT NOT NULL,
  pincode     TEXT NOT NULL,
  is_default  BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 10: store_wishlist
-- Used by: store-wishlist.controller.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE store_wishlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 11: store_sessions  (Server-side sessions for storefront)
-- Used by: store-auth.service.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE store_sessions (
  token       TEXT PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_store_sessions_customer ON store_sessions(customer_id);
CREATE INDEX idx_store_sessions_expires ON store_sessions(expires_at);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 12: otp_codes
-- Used by: store-auth.service.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_otp_codes_expires ON otp_codes(expires_at);


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 13: whatsapp_messages
-- Used by: whatsapp.service.ts
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE whatsapp_messages (
  id         TEXT PRIMARY KEY,
  "to"       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('text','receipt','image')),
  content    TEXT,
  status     TEXT DEFAULT 'queued'
    CHECK (status IN ('queued','sent','failed')),
  error      TEXT,
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_wa_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_wa_messages_to ON whatsapp_messages("to");


-- ═══════════════════════════════════════════════════════════════════════════════
-- TABLE 14: settings  (Key-value store)
-- Used by: whatsapp.service.ts (status, qr, commands)
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════════
-- RLS POLICIES — Allow service_role full access (backend uses service_role key)
-- ═══════════════════════════════════════════════════════════════════════════════
ALTER TABLE admin_users       ENABLE ROW LEVEL SECURITY;
ALTER TABLE products          ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors           ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_customers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_addresses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_wishlist    ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings          ENABLE ROW LEVEL SECURITY;

-- service_role bypasses RLS automatically.
-- For anon/public access (storefront reads), add explicit policies:
CREATE POLICY "Public read products"  ON products  FOR SELECT USING (true);
CREATE POLICY "Public read settings"  ON settings  FOR SELECT USING (true);


-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: process_sale — Atomic sale processing
-- Used by: sale.service.ts via supabaseAdmin.rpc('process_sale', {...})
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION process_sale(
  p_customer_id   UUID,
  p_subtotal      NUMERIC,
  p_gst_amount    NUMERIC,
  p_total         NUMERIC,
  p_paid_amount   NUMERIC,
  p_method        TEXT,
  p_status        TEXT,
  p_source        TEXT,
  p_date          DATE,
  p_items         JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID;
  v_item           JSONB;
  v_product_stock  INTEGER;
  v_result         JSONB;
BEGIN
  -- Validate stock for every item (with row lock)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock INTO v_product_stock
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
    END IF;

    IF v_product_stock < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for product %: % available, % requested',
        v_item->>'product_id', v_product_stock, (v_item->>'quantity')::INTEGER;
    END IF;
  END LOOP;

  -- Create transaction record
  INSERT INTO transactions (
    customer_id, subtotal, gst_amount, total, paid_amount,
    method, status, source, date
  ) VALUES (
    p_customer_id, p_subtotal, p_gst_amount, p_total, p_paid_amount,
    p_method, p_status, p_source, p_date
  )
  RETURNING id INTO v_transaction_id;

  -- Insert invoice items and decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO invoice_items (
      transaction_id, product_id, product_name,
      quantity, price, gst_amount, discount
    ) VALUES (
      v_transaction_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC,
      (v_item->>'gst_amount')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0)
    );

    -- Decrement stock with automatic status update
    UPDATE products
    SET
      stock = stock - (v_item->>'quantity')::INTEGER,
      status = CASE
        WHEN stock - (v_item->>'quantity')::INTEGER <= 0 THEN 'Out of Stock'
        WHEN stock - (v_item->>'quantity')::INTEGER < min_stock THEN 'Low Stock'
        ELSE 'In Stock'
      END,
      updated_at = NOW()
    WHERE id = (v_item->>'product_id')::UUID;
  END LOOP;

  -- Return created transaction ID
  v_result := jsonb_build_object(
    'transactionId', v_transaction_id,
    'success', true
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- RPC: cleanup_expired_auth — Remove expired OTPs and sessions
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cleanup_expired_auth()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM otp_codes WHERE expires_at < NOW();
  DELETE FROM store_sessions WHERE expires_at < NOW();
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- SEED DATA — Admin user + sample data
-- ═══════════════════════════════════════════════════════════════════════════════

-- Super Admin (login: admin@nexarats.com / Madhuri@2026)
INSERT INTO admin_users (name, email, password, role, status, permissions)
VALUES (
  'Super Admin',
  'admin@nexarats.com',
  crypt('Madhuri@2026', gen_salt('bf', 10)),
  'Super Admin',
  'Active',
  '{"dashboard": "manage", "billing": "manage", "inventory": "manage", "customers": "manage", "vendors": "manage", "analytics": "manage", "settings": "manage"}'::jsonb
) ON CONFLICT (email) DO UPDATE
  SET password = crypt('Madhuri@2026', gen_salt('bf', 10)),
      role = 'Super Admin',
      status = 'Active';

-- Sample Settings
INSERT INTO settings (key, value) VALUES
  ('business_profile', '{"name": "NexaRats Store", "phone": "+91 9876543210", "email": "contact@nexarats.com", "address": "123 Business Street, Tech Park"}'::jsonb),
  ('notifications', '{"email": true, "sms": false, "push": true, "telegram": false, "sound": true, "lowStock": true, "paymentAlerts": true}'::jsonb),
  ('gst_config', '{"gstin": "29ABCDE1234F1Z5", "enabled": true, "defaultRate": "18", "type": "intra"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Sample Products (5 items across 2 categories)
INSERT INTO products (name, sku, category, price, purchase_price, mrp, stock, min_stock, status, gst_rate, tax_type, unit) VALUES
  ('Wireless Gaming Mouse',  'TECH-M-001',   'Electronics', 2499.00, 1800.00, 3999.00, 85, 10, 'In Stock',     18, 'Inclusive', 'Pieces'),
  ('Mechanical Keyboard RGB','TECH-K-002',   'Electronics', 6499.00, 4200.00, 8999.00, 42, 10, 'In Stock',     18, 'Inclusive', 'Pieces'),
  ('Ultra HD Monitor 27"',   'TECH-MON-003', 'Electronics', 18500.00,14000.00,24000.00,  8, 10, 'Low Stock',    18, 'Inclusive', 'Pieces'),
  ('Ergonomic Desk Chair',   'FURN-C-001',   'Furniture',   12900.00, 8500.00,18000.00,  2,  5, 'Low Stock',    18, 'Inclusive', 'Pieces'),
  ('Bluetooth Headphones',   'TECH-H-004',   'Electronics', 3999.00, 2100.00, 5999.00,  0, 15, 'Out of Stock', 18, 'Inclusive', 'Pieces')
ON CONFLICT (sku) DO NOTHING;

-- Sample Customers
INSERT INTO customers (name, email, phone, total_paid, pending, status, last_transaction, total_invoices) VALUES
  ('Rahul Sharma', 'rahul@example.com', '9876543211', 25000.00,    0.00, 'Paid',    CURRENT_DATE, 4),
  ('Priya Patel',  'priya@example.com', '9876543212', 12400.00, 4500.00, 'Partial', CURRENT_DATE, 2),
  ('Amit Kumar',   'amit@example.com',  '9876543213',     0.00, 8900.00, 'Unpaid',  CURRENT_DATE, 1);

-- Sample Vendors
INSERT INTO vendors (name, business_name, phone, email, gst_number) VALUES
  ('Ravi Electronics', 'Ravi Tech Distributors', '9988776655', 'ravi@tech.com', '29AABCU9603R1ZM');

-- Sample Transactions (today's date so dashboard lights up)
INSERT INTO transactions (customer_id, subtotal, gst_amount, total, paid_amount, method, status, source, date, assigned_staff)
SELECT c.id, 19500.00, 3510.00, 23010.00, 23010.00, 'upi', 'Paid', 'offline', CURRENT_DATE, 'Super Admin'
FROM customers c WHERE c.phone = '9876543211'
UNION ALL
SELECT c.id, 14300.00, 2574.00, 16874.00, 12374.00, 'card', 'Partial', 'offline', CURRENT_DATE, 'Direct Sales'
FROM customers c WHERE c.phone = '9876543212'
UNION ALL
SELECT c.id, 4500.00, 810.00, 5310.00, 5310.00, 'cash', 'Paid', 'online', CURRENT_DATE, 'Super Admin'
FROM customers c WHERE c.phone = '9876543211';


-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION QUERIES (uncomment to test)
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT email, role, status FROM admin_users;
-- SELECT name, sku, price, stock, status FROM products;
-- SELECT name, phone, status FROM customers;
-- SELECT count(*) as transaction_count FROM transactions;
-- SELECT key FROM settings;
