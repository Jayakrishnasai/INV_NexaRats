-- 1. Create Performance Stats Table (Permanent Log)
CREATE TABLE IF NOT EXISTS performance_stats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date        DATE NOT NULL,
    hour        INTEGER NOT NULL,   -- 0-23
    source      TEXT NOT NULL,      -- 'online' or 'offline'
    revenue     NUMERIC(12,2) DEFAULT 0,
    profit      NUMERIC(12,2) DEFAULT 0,
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, hour, source)
);

-- 2. Index for fast range queries
CREATE INDEX IF NOT EXISTS idx_perf_stats_date_source ON performance_stats(date, source);

-- 3. Trigger Function to Update Stats
CREATE OR REPLACE FUNCTION update_performance_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_item_profit NUMERIC := 0;
BEGIN
    -- Only process stats for newly created transactions
    -- We don't subtract on DELETE, so the graph "stays" as requested
    IF (TG_OP = 'INSERT') THEN
    
        -- Calculate profit for this transaction
        -- Profit = Total - COGS (calculated from invoice_items join or passed in if available)
        -- For simplicity in trigger, we can fetch current COGS sum
        SELECT SUM((price - purchase_price) * quantity) INTO v_item_profit
        FROM invoice_items
        WHERE transaction_id = NEW.id;

        INSERT INTO performance_stats (date, hour, source, revenue, profit)
        VALUES (
            NEW.date,
            EXTRACT(HOUR FROM NEW.created_at),
            NEW.source,
            NEW.total,
            COALESCE(v_item_profit, 0)
        )
        ON CONFLICT (date, hour, source)
        DO UPDATE SET
            revenue = performance_stats.revenue + EXCLUDED.revenue,
            profit = performance_stats.profit + EXCLUDED.profit,
            updated_at = NOW();
            
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger
DROP TRIGGER IF EXISTS trg_update_performance_stats ON transactions;
CREATE TRIGGER trg_update_performance_stats
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_performance_stats();

-- 5. Seed Historical Data (Populate stats from existing transactions)
-- This ensures the current graph data migrates to the new permanent table
INSERT INTO performance_stats (date, hour, source, revenue, profit)
SELECT 
    t.date, 
    EXTRACT(HOUR FROM t.created_at) as hour, 
    t.source, 
    SUM(t.total) as revenue,
    SUM((SELECT SUM((ii.price - ii.purchase_price) * ii.quantity) FROM invoice_items ii WHERE ii.transaction_id = t.id)) as profit
FROM transactions t
GROUP BY t.date, hour, t.source
ON CONFLICT (date, hour, source) DO NOTHING;
