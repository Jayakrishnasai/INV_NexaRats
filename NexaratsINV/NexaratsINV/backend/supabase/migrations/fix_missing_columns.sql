-- ═══════════════════════════════════════════════════════════════════════════════
-- NexaRats Pro — Fix Missing Columns Migration
-- Run this in Supabase SQL Editor to add missing columns
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── PRODUCTS: Add missing columns ──────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18;
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER NOT NULL DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_type TEXT NOT NULL DEFAULT 'Inclusive';
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'Pieces';
ALTER TABLE products ADD COLUMN IF NOT EXISTS returns TEXT DEFAULT 'Returnable';
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Fix status column: if it's an ENUM, convert to TEXT
DO $$
BEGIN
  -- Check if 'status' column uses an enum type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'status'
    AND udt_name != 'text'
  ) THEN
    -- Drop the check constraint if any
    ALTER TABLE products ALTER COLUMN status TYPE TEXT USING status::TEXT;
  END IF;
END $$;

-- Add CHECK constraint if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'products_status_check'
  ) THEN
    BEGIN
      ALTER TABLE products ADD CONSTRAINT products_status_check
        CHECK (status IN ('In Stock','Low Stock','Out of Stock'));
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ─── CUSTOMERS: Add missing columns ────────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_invoices INTEGER DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'offline';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_transaction DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── VENDORS: Add missing columns ──────────────────────────────────────────
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_name TEXT NOT NULL DEFAULT '';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_paid NUMERIC(12,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS pending_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS last_transaction DATE;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_invoices INTEGER DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS image TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── ADMIN_USERS: Add missing columns ──────────────────────────────────────
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}';
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─── TRANSACTIONS: Add missing columns ─────────────────────────────────────
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS order_status TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS assigned_staff TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS delivery_status TEXT;

-- ─── Create missing tables if they don't exist ──────────────────────────────

-- invoice_items
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
CREATE INDEX IF NOT EXISTS idx_invoice_items_tx ON invoice_items(transaction_id);

-- purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  UUID NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT,
  amount     NUMERIC(12,2) NOT NULL,
  date       DATE NOT NULL,
  status     TEXT DEFAULT 'Paid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- store_customers
CREATE TABLE IF NOT EXISTS store_customers (
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

-- store_addresses
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

-- store_wishlist
CREATE TABLE IF NOT EXISTS store_wishlist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- store_sessions
CREATE TABLE IF NOT EXISTS store_sessions (
  token       TEXT PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES store_customers(id) ON DELETE CASCADE,
  phone       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- otp_codes
CREATE TABLE IF NOT EXISTS otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- whatsapp_messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id         TEXT PRIMARY KEY,
  "to"       TEXT NOT NULL,
  type       TEXT NOT NULL,
  content    TEXT,
  status     TEXT DEFAULT 'queued',
  error      TEXT,
  sent_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- settings (key-value)
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RLS ────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'admin_users','products','customers','vendors','transactions',
    'invoice_items','purchase_orders','store_customers','store_addresses',
    'store_wishlist','store_sessions','otp_codes','whatsapp_messages','settings'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- Public read policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read products') THEN
    CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read settings') THEN
    CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);
  END IF;
END $$;


-- ─── RPC: process_sale ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_sale(
  p_customer_id UUID, p_subtotal NUMERIC, p_gst_amount NUMERIC,
  p_total NUMERIC, p_paid_amount NUMERIC, p_method TEXT,
  p_status TEXT, p_source TEXT, p_date DATE, p_items JSONB
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id UUID; v_item JSONB; v_product_stock INTEGER; v_result JSONB;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT stock INTO v_product_stock FROM products
    WHERE id = (v_item->>'product_id')::UUID FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Product % not found', v_item->>'product_id'; END IF;
    IF v_product_stock < (v_item->>'quantity')::INTEGER THEN
      RAISE EXCEPTION 'Insufficient stock for %', v_item->>'product_id';
    END IF;
  END LOOP;

  INSERT INTO transactions (customer_id,subtotal,gst_amount,total,paid_amount,method,status,source,date)
  VALUES (p_customer_id,p_subtotal,p_gst_amount,p_total,p_paid_amount,p_method,p_status,p_source,p_date)
  RETURNING id INTO v_transaction_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO invoice_items (transaction_id,product_id,product_name,quantity,price,gst_amount,discount)
    VALUES (v_transaction_id,(v_item->>'product_id')::UUID,v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,(v_item->>'price')::NUMERIC,
      (v_item->>'gst_amount')::NUMERIC,COALESCE((v_item->>'discount')::NUMERIC,0));
    UPDATE products SET stock=stock-(v_item->>'quantity')::INTEGER,
      status=CASE WHEN stock-(v_item->>'quantity')::INTEGER<=0 THEN 'Out of Stock'
        WHEN stock-(v_item->>'quantity')::INTEGER<min_stock THEN 'Low Stock' ELSE 'In Stock' END,
      updated_at=NOW()
    WHERE id=(v_item->>'product_id')::UUID;
  END LOOP;

  v_result:=jsonb_build_object('transactionId',v_transaction_id,'success',true);
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;


-- ─── RPC: cleanup_expired_auth ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION cleanup_expired_auth() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN DELETE FROM otp_codes WHERE expires_at < NOW(); DELETE FROM store_sessions WHERE expires_at < NOW(); END; $$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE! All columns and tables now match the backend code expectations.
-- ═══════════════════════════════════════════════════════════════════════════════
