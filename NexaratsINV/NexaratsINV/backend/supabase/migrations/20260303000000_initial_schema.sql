-- ═══════════════════════════════════════════════════════════════════════════════
-- NexaRats Pro — Supabase Database Migration
-- Idempotent: drops partial tables from any previous failed runs first
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Drop existing tables (reverse FK order) ──────────────────────────────────
-- Safe to run on a fresh DB — IF EXISTS means no error if tables don't exist.
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

-- ─── Enable UUID extension ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ─── 1. admin_users ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,          -- bcrypt hash (NEVER plain text)
  role        TEXT NOT NULL DEFAULT 'Manager',
  status      TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  permissions JSONB NOT NULL DEFAULT '{}',
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users(email);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS — no explicit policy needed for server-side access

-- ─── 2. products ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  sku                 TEXT UNIQUE NOT NULL,
  category            TEXT NOT NULL,
  price               NUMERIC(12,2) NOT NULL,
  purchase_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  mrp                 NUMERIC(12,2) NOT NULL,
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
CREATE INDEX IF NOT EXISTS products_sku_idx ON products(sku);
CREATE INDEX IF NOT EXISTS products_category_idx ON products(category);
CREATE INDEX IF NOT EXISTS products_status_idx ON products(status);
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- ─── 3. customers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
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
CREATE INDEX IF NOT EXISTS customers_phone_idx ON customers(phone);
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- ─── 4. vendors ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
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
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

-- ─── 5. transactions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
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
CREATE INDEX IF NOT EXISTS transactions_customer_idx ON transactions(customer_id);
CREATE INDEX IF NOT EXISTS transactions_source_idx ON transactions(source);
CREATE INDEX IF NOT EXISTS transactions_date_idx ON transactions(date);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ─── 6. invoice_items ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_items (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name   TEXT NOT NULL,
  quantity       INTEGER NOT NULL,
  price          NUMERIC(12,2) NOT NULL,
  gst_amount     NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount       NUMERIC(12,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS invoice_items_tx_idx ON invoice_items(transaction_id);
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- ─── 7. purchase_orders ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  amount     NUMERIC(12,2) NOT NULL,
  date       DATE NOT NULL,
  status     TEXT DEFAULT 'Paid'
    CHECK (status IN ('Paid','Unpaid','Partial')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS purchase_orders_vendor_idx ON purchase_orders(vendor_id);
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- ─── 8. store_customers ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_customers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  phone        TEXT UNIQUE NOT NULL,
  email        TEXT,
  password     TEXT,                  -- bcrypt hash (optional)
  total_orders INTEGER DEFAULT 0,
  total_spent  NUMERIC(12,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS store_customers_phone_idx ON store_customers(phone);
ALTER TABLE store_customers ENABLE ROW LEVEL SECURITY;

-- ─── 9. store_addresses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_addresses (
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
ALTER TABLE store_addresses ENABLE ROW LEVEL SECURITY;

-- ─── 10. store_wishlist ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_wishlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);
ALTER TABLE store_wishlist ENABLE ROW LEVEL SECURITY;

-- ─── 11. store_sessions (FIX C3: server-side sessions) ───────────────────────
CREATE TABLE IF NOT EXISTS store_sessions (
  token       TEXT PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS store_sessions_customer_idx ON store_sessions(customer_id);
CREATE INDEX IF NOT EXISTS store_sessions_expires_idx ON store_sessions(expires_at);

-- ─── 12. otp_codes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,          -- bcrypt hash
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes(phone);
CREATE INDEX IF NOT EXISTS otp_codes_expires_idx ON otp_codes(expires_at);

-- ─── 13. whatsapp_messages ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_messages (
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
CREATE INDEX IF NOT EXISTS wa_messages_status_idx ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS wa_messages_to_idx ON whatsapp_messages("to");

-- ─── 14. settings (key-value store) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ATOMIC SALE RPC — process_sale
-- FIX C2: All three operations (stock decrement, invoice create, items insert)
-- execute in a single PostgreSQL transaction. ROLLBACK on any failure.
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
SECURITY DEFINER  -- runs with owner privileges to bypass RLS
AS $$
DECLARE
  v_transaction_id UUID;
  v_item           JSONB;
  v_product_stock  INTEGER;
  v_result         JSONB;
BEGIN
  -- ── Validate stock for every item (with row lock to prevent race conditions) ──
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT stock INTO v_product_stock
    FROM products
    WHERE id = (v_item->>'product_id')::UUID
    FOR UPDATE;  -- row-level lock prevents concurrent oversells

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product % not found', v_item->>'product_id';
    END IF;

    IF v_product_stock < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for product %: % available, % requested',
        v_item->>'product_id', v_product_stock, (v_item->>'quantity')::INTEGER;
    END IF;
  END LOOP;

  -- ── Create transaction record ──────────────────────────────────────────────
  INSERT INTO transactions (
    customer_id, subtotal, gst_amount, total, paid_amount,
    method, status, source, date
  ) VALUES (
    p_customer_id, p_subtotal, p_gst_amount, p_total, p_paid_amount,
    p_method, p_status, p_source, p_date
  )
  RETURNING id INTO v_transaction_id;

  -- ── Insert invoice items and decrement stock ────────────────────────────────
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert invoice item
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

  -- ── Return created transaction ID ──────────────────────────────────────────
  v_result := jsonb_build_object(
    'transactionId', v_transaction_id,
    'success', true
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- PostgreSQL automatically rolls back on RAISE EXCEPTION
    RAISE;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CLEANUP FUNCTION — remove expired OTP codes and store sessions
-- Schedule this via Supabase pg_cron or call manually
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
-- OPTIONAL: Schedule cleanup every hour using pg_cron (if enabled on project)
-- ═══════════════════════════════════════════════════════════════════════════════
-- SELECT cron.schedule('cleanup-auth', '0 * * * *', 'SELECT cleanup_expired_auth()');
