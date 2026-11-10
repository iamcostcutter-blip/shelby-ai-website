-- Shelby AI Receptionist: reviewed staging schema (not applied to production)
-- These definitions alone do NOT enforce tenant authorization. Use a trusted app
-- layer and audited DB roles with RLS context, tested before real-person data.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL CHECK (length(business_name) BETWEEN 1 AND 180),
  status text NOT NULL DEFAULT 'pilot' CHECK(status IN ('pilot','active','paused','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS owner_memberships (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject_id text NOT NULL CHECK(length(subject_id) BETWEEN 1 AND 180),
  role text NOT NULL CHECK(role IN ('owner','staff')),
  PRIMARY KEY(tenant_id,subject_id)
);

CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  idempotency_key text NOT NULL CHECK(length(idempotency_key) BETWEEN 8 AND 128),
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_until timestamptz NOT NULL,
  subject text NOT NULL CHECK(length(subject) <= 180),
  description text NOT NULL CHECK(length(description) <= 4000),
  contact_ciphertext bytea,
  contact_kid text,
  consent_version text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewing','done','deleted')),
  UNIQUE(tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS enquiries_by_tenant ON enquiries(tenant_id,created_at DESC);
CREATE INDEX IF NOT EXISTS enquiries_retention ON enquiries(retention_until);

CREATE TABLE IF NOT EXISTS notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  enquiry_id uuid NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','delivered','retry','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error_code text,
  provider_message_id text,
  delivered_at timestamptz,
  UNIQUE(enquiry_id)
);
CREATE INDEX IF NOT EXISTS notification_pending_idx ON notification_outbox(next_attempt_at)
  WHERE state IN ('pending','retry');

-- Runtime code MUST set a validated tenant context after verifying an authenticated owner
-- or site-scoped service credential. Never trust a user-supplied tenant_id without verification.
ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE enquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_outbox FORCE ROW LEVEL SECURITY;
CREATE POLICY enquiries_tenant_policy ON enquiries
  FOR ALL USING (tenant_id = nullif(current_setting('shelby.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('shelby.tenant_id',true),'')::uuid);
CREATE POLICY notification_tenant_policy ON notification_outbox
  FOR ALL USING (tenant_id = nullif(current_setting('shelby.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('shelby.tenant_id',true),'')::uuid);
-- WARNING: superusers, table owners without FORCE (if schema changed) and BYPASSRLS roles
-- can bypass RLS. Production requires least-privilege DB roles, transaction-bound
-- SET LOCAL tenant context, connection-pool tests and independent security review.
COMMIT;
