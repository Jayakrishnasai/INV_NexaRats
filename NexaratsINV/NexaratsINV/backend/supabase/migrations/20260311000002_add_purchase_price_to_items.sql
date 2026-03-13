-- Add purchase_price column to invoice_items to track cost at time of sale
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Update process_sale RPC to include purchase_price
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
  -- ── Validate stock for every item ──
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

  -- ── Create transaction record ──
  INSERT INTO transactions (
    customer_id, subtotal, gst_amount, total, paid_amount,
    method, status, source, date, processed
  ) VALUES (
    p_customer_id, p_subtotal, p_gst_amount, p_total, p_paid_amount,
    p_method, p_status, p_source, p_date, FALSE
  )
  RETURNING id INTO v_transaction_id;

  -- ── Insert invoice items and decrement stock ──
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insert invoice item WITH purchase_price
    INSERT INTO invoice_items (
      transaction_id, product_id, product_name,
      quantity, price, gst_amount, discount, purchase_price
    ) VALUES (
      v_transaction_id,
      (v_item->>'product_id')::UUID,
      v_item->>'product_name',
      (v_item->>'quantity')::INTEGER,
      (v_item->>'price')::NUMERIC,
      (v_item->>'gst_amount')::NUMERIC,
      COALESCE((v_item->>'discount')::NUMERIC, 0),
      COALESCE((v_item->>'purchase_price')::NUMERIC, 0)
    );

    -- Decrement stock
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
