-- Add short display IDs for customers and vendors (e.g. C7x2k, V9m4p)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS display_id TEXT;
ALTER TABLE vendors   ADD COLUMN IF NOT EXISTS display_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS customers_display_id_key ON customers(display_id) WHERE display_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vendors_display_id_key   ON vendors(display_id) WHERE display_id IS NOT NULL;
