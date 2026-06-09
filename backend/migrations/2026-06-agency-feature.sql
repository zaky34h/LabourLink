-- ============================================================================
-- Agency feature — additive, idempotent migration.
--
-- Safe to run against an existing LabourLink database: every statement uses
-- IF NOT EXISTS and every new column is nullable/defaulted, so existing rows
-- and the builder/labourer/owner flows are unaffected.
--
-- These same statements also run automatically in initDb() on server boot
-- (consistent with how the app applies migrations). This file is provided so
-- they can be reviewed/applied manually first. DO NOT run blindly against prod.
--
-- Phase 0 decision: managed labourers are stored in `users` (role='labourer')
-- with a `managed_by_agency_id` pointer — this reuses the email-keyed offers,
-- browse, and projection machinery unchanged. Agencies are also `users`
-- (role='agency'). Managed labourers have an unusable password and are rejected
-- at /auth/login.
-- ============================================================================

BEGIN;

-- --- Managed-labourer profile fields (agency-owned) -------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS managed_by_agency_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suburb TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS skills JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tickets JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS availability JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS labourer_status TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notes TEXT;

-- --- Agency account fields (company identity + subscription) ----------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS public_handle TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS abn TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT;   -- Starter | Crew | Fleet | Enterprise
ALTER TABLE users ADD COLUMN IF NOT EXISTS seat_limit INTEGER;       -- 5 / 20 / 50 / custom
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_renews_at BIGINT;    -- epoch ms (trial/renewal end)

-- Fast roster lookups by managing agency.
CREATE INDEX IF NOT EXISTS users_managed_by_agency_idx
  ON users (managed_by_agency_id)
  WHERE managed_by_agency_id IS NOT NULL;

-- --- Placements (created when an agency accepts an offer) --------------------
CREATE TABLE IF NOT EXISTS agency_placements (
  id              TEXT PRIMARY KEY,
  agency_email    TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  labourer_email  TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  offer_id        TEXT REFERENCES offers(id) ON DELETE SET NULL,
  builder_company TEXT NOT NULL,
  site            TEXT NOT NULL,
  trade           TEXT NOT NULL,
  start_date      TEXT NOT NULL,
  end_date        TEXT,
  hourly_rate     DOUBLE PRECISION NOT NULL,
  status          TEXT NOT NULL,             -- active | completed
  created_at      BIGINT NOT NULL,
  updated_at      BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS agency_placements_agency_idx   ON agency_placements (agency_email);
CREATE INDEX IF NOT EXISTS agency_placements_labourer_idx ON agency_placements (labourer_email);

COMMIT;
