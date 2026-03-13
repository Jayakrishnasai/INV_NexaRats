-- Fix typo in previous migration: add processed flag to purchase_orders instead of purchases
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- Optional: If the 'purchases' table was accidentally created, we could drop it, 
-- but IF NOT EXISTS handled it without creating a table if it didn't exist.
-- To be safe, let's ensure existing purchase_orders are marked as false
UPDATE purchase_orders SET processed = FALSE WHERE processed IS NULL;
