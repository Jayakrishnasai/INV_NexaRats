-- Add processed flag for daily dashboard reset
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE;

-- We don't add processed to customers, vendors, products because they are master data (inventory, CRM).
-- The dashboard data reset applies to transactional data which makes up the daily activity.
