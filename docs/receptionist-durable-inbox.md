# Receptionist staging: durable inbox data model
Status: design/staging source only, 2026-11-10. No personal data enabled. No database provisioned.

Staging SQL: ../pilot-api/schema.sql

1. A business owner signs in with a secure identity provider. The server verifies their session and a membership to the tenant, never taking tenant identity on trust from the browser.
2. A public widget uses a domain-scoped, rate-limited site token to accept a consented enquiry. Server maps the token to the tenant, validates fields and encrypts contact data with a key outside the database.
3. A database transaction inserts the enquiry and notification outbox record together with an idempotency key. Successful requests must remain readable after process restart.
4. A separate worker delivers a minimal-content notification and retries transient errors; full enquiry details stay in the authenticated owner inbox. Delivery receipts are verifiable.
5. Retention/deletion policy, privacy notice, access logs, backups, DPA, incident response and user rights handling must be approved before any real customer data.
6. A signed Stripe webhook with idempotency updates tenant billing state after the full workflow passes acceptance tests.

Important: SQL RLS policies alone are not a complete authorization system. Before public data, test cross-tenant isolation, privileged DB roles, pooled connection tenant-scoping, encryption, abuse controls and restoration.

## Acceptance tests before first pilot
- POST fictional enquiry; see it in protected inbox after service restart.
- User of tenant A cannot access B. Try forged tenant IDs and expired sessions.
- Repeated POST same idempotency key yields one enquiry and one notification only.
- Notification delivery and retry verified; no credentials or contact data in logs.
- User can delete enquiry and see it absent from active DB and backed-up retention plan.
- Privacy and support contact published. Confirm service is genuinely operating before live £29 checkout.

## Current verified progress
- Public marketing site and demo: on Render.
- Synthetic-only ephemeral API: on Render.
- Independent GitHub-hosted smoke run 42902481080 passed against deployed API.
- This database model is not deployed; real lead ingestion remains disabled.
