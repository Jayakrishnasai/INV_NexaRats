-- Add fields generally needed for purchase orders: reference, notes, paid amount
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS reference_no TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12,2);

-- Backfill paid_amount for existing rows: Paid => amount, Unpaid => 0, Partial => amount/2 as default
UPDATE purchase_orders
SET paid_amount = CASE
    WHEN status = 'Paid' THEN amount
    WHEN status = 'Unpaid' THEN 0
    ELSE COALESCE(paid_amount, amount * 0.5)
END
WHERE paid_amount IS NULL;
