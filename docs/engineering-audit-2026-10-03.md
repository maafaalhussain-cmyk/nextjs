# J&M engineering audit — 3 October 2026

## Scope and safety
Reviewed the repository tree, authentication components, account screens, Supabase migrations 0001–0008, package manifest/lock, and CI workflow. Changes in this branch are not deployed and no production database was accessed or modified.

## Fixes committed in this branch
- Blue/white authentication styling with small floral accents.
- Password reset route and form using Supabase `updateUser`, with confirmation and minimum-length checks.
- Forgot-password mode requests email only.
- Signup database trigger ignores client-provided privileged role metadata; new accounts start as customers. Seller requests are recorded as pending applications.
- Seller approval RPC updates role and seller_status together.
- Security hardening removes overlapping permissive seller product policies. PostgreSQL permissive policies combine with OR, so leaving the older policy names in place would have allowed the weaker policy to bypass approval.
- Ledger immutability trigger now protects INSERT/UPDATE/DELETE against posted journals; posting guard rejects direct insertion as posted and validates debit/credit balance when a draft is posted.

## Confirmed repository issues still open
1. Duplicate migration version prefixes: `0001_marketplace.sql` and `0001_marketplace_core.sql`; `0002_security_hardening.sql` and `0002_seller_approval.sql`. Migration runners such as Supabase CLI expect unique version identifiers. Do not run a fresh migration push until the actual remote migration history is retrieved and reconciled.
2. The two initial schemas materially differ (seller status values, product columns, order status/columns). `IF NOT EXISTS` does not reconcile existing table definitions.
3. `package.json` uses `latest` for Next/React and declares Supabase JS, while `package-lock.json` root describes a different app/version and dependency set and does not record the same manifest. Build currently uses `npm install`, which can mutate the lock in CI; a clean deterministic `npm ci` has not been proven. Generate and commit a real lockfile in a controlled Node 22 environment before switching CI to npm ci.
4. No verified Supabase staging connection, payment provider, carrier integration, server-side checkout, or real account/ledger data was available to this audit. No E2E, RLS integration, webhook, or balance test has been run against a live database.
5. The storefront root remains a coming-soon/maintenance page; customer checkout, order management, seller product dashboard and admin console are not implemented as complete operational flows.

## Required before production
- Export/inspect Supabase migration history and schema from the actual project; identify whether either duplicate-version migration has already run.
- Build a single canonical schema and a forward-only migration plan tailored to that history. Back up database and test restore first.
- Run migrations on a disposable staging database; test signup as customer/seller, self-role escalation denial, admin seller approval/rejection, product write denial before approval, RLS isolation, delivery OTP, cancellation, promotion constraints, and double-entry ledger balance/immutability.
- Pin dependency versions, regenerate package-lock with npm v10/Node 22, then use `npm ci` and build.
- Complete real payment/shipping integration and reconciliation tests before enabling checkout.
- Configure Supabase Auth redirect allow-list to include the production and preview reset-password URLs.

## Release decision
Not production-ready. Keep the PR draft and do not merge or apply migrations to production until the database history and staging tests are available.
