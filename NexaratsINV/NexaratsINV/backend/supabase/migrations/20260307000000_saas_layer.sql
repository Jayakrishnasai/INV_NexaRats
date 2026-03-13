-- ═══════════════════════════════════════════════════════════════════════════════
-- NexaRats SaaS Layer — Migration 20260307000000
-- Phase A: Add multi-tenant SaaS infrastructure
-- Idempotent: uses IF NOT EXISTS / IF EXISTS guards throughout
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── A1. organizations (the tenant unit) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organizations (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  slug                  TEXT UNIQUE NOT NULL,
  owner_user_id         UUID,                     -- set after user row is created
  subscription_status   TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial','active','past_due','cancelled','paused')),
  onboarding_step       INTEGER NOT NULL DEFAULT 0
    CHECK (onboarding_step BETWEEN 0 AND 6),
  onboarding_complete   BOOLEAN NOT NULL DEFAULT FALSE,
  razorpay_customer_id  TEXT,                     -- Nexarats' Razorpay customer ID for billing
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS organizations_slug_idx    ON organizations(slug);
CREATE INDEX IF NOT EXISTS organizations_status_idx  ON organizations(subscription_status);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- ─── A2 + A3. users (SaaS customer accounts, scoped to org) ─────────────────────
CREATE TABLE IF NOT EXISTS saas_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE,
  email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
  password        TEXT NOT NULL,                  -- bcrypt hash, never plaintext
  name            TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'owner'
    CHECK (role IN ('owner','admin','member')),
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','suspended','invited')),
  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS saas_users_org_idx    ON saas_users(organization_id);
CREATE INDEX IF NOT EXISTS saas_users_email_idx  ON saas_users(LOWER(email));
ALTER TABLE saas_users ENABLE ROW LEVEL SECURITY;

-- Back-fill the owner FK now that saas_users exists
ALTER TABLE organizations
  ADD CONSTRAINT IF NOT EXISTS fk_owner_user
  FOREIGN KEY (owner_user_id) REFERENCES saas_users(id) ON DELETE SET NULL;

-- ─── A4. plans (pricing tiers) ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                      TEXT NOT NULL,
  slug                      TEXT UNIQUE NOT NULL,
  price_monthly             NUMERIC(10,2) NOT NULL,
  price_annual              NUMERIC(10,2) NOT NULL,
  max_users                 INTEGER NOT NULL DEFAULT 1,
  max_invoices_monthly      INTEGER NOT NULL DEFAULT 100,
  max_products              INTEGER NOT NULL DEFAULT 50,
  features                  JSONB NOT NULL DEFAULT '[]',
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  razorpay_plan_id_monthly  TEXT,
  razorpay_plan_id_annual   TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A21. Seed the 3 default plans (idempotent via ON CONFLICT DO NOTHING)
INSERT INTO plans (name, slug, price_monthly, price_annual, max_users, max_invoices_monthly, max_products, features)
VALUES
  (
    'Basic', 'basic', 999.00, 9990.00, 2, 200, 100,
    '["Invoice management","Customer management","WhatsApp invoices","Basic analytics","Email support"]'
  ),
  (
    'Pro', 'pro', 2499.00, 24990.00, 10, 2000, 1000,
    '["Everything in Basic","Online store","Razorpay payment links","Advanced analytics","GST reports","Priority support"]'
  ),
  (
    'Enterprise', 'enterprise', 5999.00, 59990.00, 50, -1, -1,
    '["Everything in Pro","Unlimited invoices","Unlimited products","Custom branding","Dedicated account manager","API access","SLA guarantee"]'
  )
ON CONFLICT (slug) DO NOTHING;

-- ─── A5. subscriptions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id                   UUID NOT NULL REFERENCES plans(id),
  status                    TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial','active','past_due','cancelled','paused')),
  billing_cycle             TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly','annual')),
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  trial_ends_at             TIMESTAMPTZ,
  razorpay_subscription_id  TEXT UNIQUE,
  cancelled_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscriptions_status_idx ON subscriptions(status);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ─── A6. subscription_events (webhook event log) ─────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id     UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  razorpay_event_id   TEXT UNIQUE,                -- deduplication key
  payload             JSONB,
  processed           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sub_events_sub_idx  ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS sub_events_type_idx ON subscription_events(event_type, created_at DESC);

-- ─── A7. payments (SaaS billing payments, separate from product POS payments) ─
CREATE TABLE IF NOT EXISTS saas_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id),
  subscription_id     UUID REFERENCES subscriptions(id),
  razorpay_payment_id TEXT NOT NULL UNIQUE,
  razorpay_order_id   TEXT,
  amount              NUMERIC(10,2) NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'INR',
  status              TEXT NOT NULL
    CHECK (status IN ('captured','failed','refunded','pending')),
  payment_method      TEXT,
  failure_reason      TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS saas_payments_org_idx    ON saas_payments(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saas_payments_status_idx ON saas_payments(status);

-- ─── A8. razorpay_keys (per-tenant encrypted Razorpay credentials) ──────────
CREATE TABLE IF NOT EXISTS razorpay_keys (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  key_id           TEXT NOT NULL,                 -- publishable key, plaintext is safe
  key_secret_enc   TEXT NOT NULL,                 -- AES-256-GCM encrypted
  iv               TEXT NOT NULL,                 -- hex-encoded 96-bit IV
  auth_tag         TEXT NOT NULL,                 -- hex-encoded GCM auth tag
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  last_verified_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── A9. audit_logs (immutable action history) ───────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES saas_users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  resource_type   TEXT,
  resource_id     UUID,
  ip_address      INET,
  user_agent      TEXT,
  metadata        JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Initial partition: 2026 (add more via cron or manually each year)
CREATE TABLE IF NOT EXISTS audit_logs_2026
  PARTITION OF audit_logs
  FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE INDEX IF NOT EXISTS audit_logs_org_idx   ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx  ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON audit_logs(action, created_at DESC);

-- ─── A10. usage_metrics ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usage_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metric_name     TEXT NOT NULL,
  metric_value    BIGINT NOT NULL DEFAULT 0,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, metric_name, period_start)
);
CREATE INDEX IF NOT EXISTS usage_metrics_org_idx ON usage_metrics(organization_id, period_start DESC);

-- ─── A11. email_verifications (for signup email verification) ────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES saas_users(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,                      -- bcrypt hash of the 6-digit code
  expires_at  TIMESTAMPTZ NOT NULL,
  used        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS email_ver_user_idx    ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS email_ver_expires_idx ON email_verifications(expires_at);

-- ─── A12–A17. Add organization_id to all existing tenant-scoped tables ────────
ALTER TABLE products        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE customers       ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE vendors         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE transactions    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE invoice_items   ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE store_customers ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Performance indexes for the new FK columns
CREATE INDEX IF NOT EXISTS products_org_idx        ON products(organization_id);
CREATE INDEX IF NOT EXISTS customers_org_idx       ON customers(organization_id);
CREATE INDEX IF NOT EXISTS vendors_org_idx         ON vendors(organization_id);
CREATE INDEX IF NOT EXISTS transactions_org_idx    ON transactions(organization_id, date DESC);
CREATE INDEX IF NOT EXISTS invoice_items_org_idx   ON invoice_items(organization_id);
CREATE INDEX IF NOT EXISTS store_customers_org_idx ON store_customers(organization_id);

-- ─── A18–A19. RLS policies for tenant isolation ───────────────────────────────
-- NOTE: The backend uses service_role key which bypasses RLS.
-- These policies protect against accidental direct DB access.
-- The API layer MUST also enforce org_id filtering on every query.

CREATE POLICY IF NOT EXISTS tenant_isolation_products
  ON products USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY IF NOT EXISTS tenant_isolation_customers
  ON customers USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY IF NOT EXISTS tenant_isolation_vendors
  ON vendors USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

CREATE POLICY IF NOT EXISTS tenant_isolation_transactions
  ON transactions USING (organization_id = current_setting('app.current_org_id', TRUE)::UUID);

-- ─── A20. Trigger to auto-update updated_at columns ─────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'organizations_updated_at') THEN
    CREATE TRIGGER organizations_updated_at
      BEFORE UPDATE ON organizations
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'saas_users_updated_at') THEN
    CREATE TRIGGER saas_users_updated_at
      BEFORE UPDATE ON saas_users
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'subscriptions_updated_at') THEN
    CREATE TRIGGER subscriptions_updated_at
      BEFORE UPDATE ON subscriptions
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'razorpay_keys_updated_at') THEN
    CREATE TRIGGER razorpay_keys_updated_at
      BEFORE UPDATE ON razorpay_keys
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;
