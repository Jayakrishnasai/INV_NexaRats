-- Revert transactions to use SET NULL for customer_id
-- This ensures the Performance Overview graph remains accurate even if a customer is deleted.
-- The historical sale is preserved in the aggregate metrics.

ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;

ALTER TABLE transactions
ADD CONSTRAINT transactions_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE SET NULL;

-- Keep ON DELETE CASCADE for invoice_items (they belong to transactions)
-- Keep ON DELETE CASCADE for purchase_orders (Vendor deletion removes purchase history by design)
