# Shelby AI Business Factory: first customer plan
Status: staged plan only, not an operational paid receptionist. Updated 2026-11-10.

## Team
- Shelby coordinates and checks evidence before delegating.
- Research agent checks competitor offers, target industries, and source-backed customer needs.
- Builder agent delivers code, deployment instructions, and automated tests.
- QA agent checks synthetic leads, security, mobile UX, notifications, and recovery.
- Sales agent drafts a truthful pilot invitation; sending or buying lists is not automatic.

## First revenue workflow
Website visit -> clear privacy notice -> secure API validation -> durable tenant-isolated database -> authenticated owner inbox -> notification queue -> delivery receipt -> follow-up -> subscription only after fulfillment works.

## Acceptance gates
1. Synthetic POST returns a receipt; owner can retrieve it after service restart.
2. Tenant A cannot read or modify tenant B data; authenticated owner only.
3. Deduplicate repeated submissions and limit abuse; log no raw contact details.
4. Verify notification delivery, retries, failed deliveries and deletion/retention.
5. Test one real consenting UK business pilot before opening live £29 monthly checkout.
6. Verify signed Stripe webhook, failed payment, cancellation and refund policy.
7. Publish operational support contact, privacy and terms, with UK GDPR review.

## Verified status
- Public Shelby AI website and synthetic-only Render API are deployed.
- Browser UI for synthetic testing is live; actual synthetic submission success not yet verified.
- API stores only fictional UUID records temporarily in memory; no real inbox, notifications or revenue.
- Automated API tests and GitHub workflow were committed; passing test-run not yet verified.
- Shelby n8n planning job 04f16934e23b4497b3c1b444a7779330 is blocked on Claude Code planning.

## Next action
Verify CI tests and synthetic POST, then build staged durable storage, login-protected inbox, and verified email notifications. Avoid charging users until delivery is ready.