-- ═══════════════════════════════════════════════════════════════════════════════
-- NexaRats Pro — Supabase DB Seed (With Admin Credentials)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run this AFTER running the `20260303000000_initial_schema.sql` migration.
-- Make sure the pgcrypto extension is active (it's activated in the schema).

-- ─── 1. Admin Credentials ────────────────────────────────────────────────────
-- Email: admin@nexarats.com
-- Password: Madhuri@2026
-- Role: Super Admin
INSERT INTO admin_users (id, name, email, password, role, status, permissions)
VALUES (
  gen_random_uuid(),
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

-- ─── 2. Global Settings ──────────────────────────────────────────────────────
INSERT INTO settings (key, value)
VALUES 
  ('business_profile', '{"name": "NexaRats Store", "phone": "+91 9876543210", "email": "contact@nexarats.com", "address": "123 Business Street, Tech Park"}'),
  ('notifications', '{"email": true, "sms": false, "push": true, "telegram": false, "sound": true, "lowStock": true, "paymentAlerts": true}'),
  ('gst_config', '{"gstin": "29ABCDE1234F1Z5", "enabled": true, "defaultRate": "18", "type": "intra"}')
ON CONFLICT (key) DO NOTHING;

-- ─── 3. Sample Products ──────────────────────────────────────────────────────
INSERT INTO products (id, name, sku, category, price, stock, status)
VALUES
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Wireless Gaming Mouse', 'TECH-M-001', 'Electronics', 2499.00, 85, 'In Stock'),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'Mechanical Keyboard RGB', 'TECH-K-002', 'Electronics', 6499.00, 42, 'In Stock'),
  ('c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f', 'Ultra HD Monitor 27"', 'TECH-MON-003', 'Electronics', 18500.00, 8, 'Low Stock'),
  ('d4e5f6a7-b8c9-7d8e-1f2a-3b4c5d6e7f8a', 'Ergonomic Desk Chair', 'FURN-C-001', 'Furniture', 12900.00, 2, 'Low Stock'),
  ('e5f6a7b8-c9d0-8e9f-2a3b-4c5d6e7f8a9b', 'Bluetooth Headphones', 'TECH-H-004', 'Electronics', 3999.00, 0, 'Out of Stock')
ON CONFLICT (sku) DO NOTHING;

-- ─── 4. Sample Customers ─────────────────────────────────────────────────────
INSERT INTO customers (id, name, email, phone, total_paid, pending, status, last_transaction, total_invoices)
VALUES
  ('1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Rahul Sharma', 'rahul@example.com', '9876543211', 25000.00, 0.00, 'Paid', CURRENT_DATE, 4),
  ('2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 'Priya Patel', 'priya@example.com', '9876543212', 12400.00, 4500.00, 'Partial', CURRENT_DATE, 2),
  ('3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f', 'Amit Kumar', 'amit@example.com', '9876543213', 0.00, 8900.00, 'Unpaid', CURRENT_DATE, 1)
ON CONFLICT (phone) DO NOTHING;

-- ─── 5. Sample Transactions ──────────────────────────────────────────────────
-- (Just adding header records to populate the dashboard metrics)
INSERT INTO transactions (id, customer_id, subtotal, gst_amount, total, paid_amount, method, status, source, date, assigned_staff)
VALUES
  (gen_random_uuid(), '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 19500.00, 3510.00, 23010.00, 23010.00, 'UPI', 'Paid', 'offline', CURRENT_DATE, 'Super Admin'),
  (gen_random_uuid(), '2b3c4d5e-6f7a-8b9c-0d1e-2f3a4b5c6d7e', 14300.00, 2574.00, 16874.00, 12374.00, 'Card', 'Partial', 'offline', CURRENT_DATE, 'Direct Sales'),
  (gen_random_uuid(), '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 4500.00, 810.00, 5310.00, 5310.00, 'Cash', 'Paid', 'online', CURRENT_DATE, 'Super Admin')
ON CONFLICT DO NOTHING;

-- Optional verification query:
-- SELECT email, role FROM admin_users;
