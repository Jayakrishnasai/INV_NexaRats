-- Fix cascading deletes for Customers and Vendors
-- This ensures that deleting a customer or vendor also removes their associated transactions/purchases
-- as requested by the user and as indicated in the frontend confirmation dialogs.

-- 1. Fix Transactions (Customer reference)
ALTER TABLE transactions 
DROP CONSTRAINT IF EXISTS transactions_customer_id_fkey;

ALTER TABLE transactions
ADD CONSTRAINT transactions_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES customers(id) 
ON DELETE CASCADE;

-- 2. Fix Purchase Orders (Vendor reference)
ALTER TABLE purchase_orders
DROP CONSTRAINT IF EXISTS purchase_orders_vendor_id_fkey;

ALTER TABLE purchase_orders
ADD CONSTRAINT purchase_orders_vendor_id_fkey 
FOREIGN KEY (vendor_id) 
REFERENCES vendors(id) 
ON DELETE CASCADE;

-- 3. Fix Store Addresses (if any)
ALTER TABLE store_addresses
DROP CONSTRAINT IF EXISTS store_addresses_customer_id_fkey;

ALTER TABLE store_addresses
ADD CONSTRAINT store_addresses_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES store_customers(id) 
ON DELETE CASCADE;

-- 4. Fix Store Wishlist
ALTER TABLE store_wishlist
DROP CONSTRAINT IF EXISTS store_wishlist_customer_id_fkey;

ALTER TABLE store_wishlist
ADD CONSTRAINT store_wishlist_customer_id_fkey 
FOREIGN KEY (customer_id) 
REFERENCES store_customers(id) 
ON DELETE CASCADE;
