# J&M schema reconciliation audit

Date: 2026-10-03
Branch: `audit/jm-schema-reconciliation`

## Status

This is a read-only audit note. No database migration was applied and no production data was changed. The current migration directory is not safe to apply as a fresh, ordered Supabase migration history until the conflicting roots are reconciled.

## Findings confirmed from the repository

1. Two different root migrations use version `0001`:
   - `0001_marketplace.sql`
   - `0001_marketplace_core.sql`

   They define incompatible schemas. Examples:
   - `profiles.seller_status`: `not_applicable` vs `none`.
   - `products`: one schema requires `category` and uses `numeric(10,2)`; the other omits category and uses `numeric(12,2)`.
   - `orders`: different status values and shipping/address/payment columns.
   - `order_items`: different seller workflow columns.

2. Two different migrations use version `0002`:
   - `0002_security_hardening.sql`
   - `0002_seller_approval.sql`

   Migration ordering is therefore ambiguous and the seller-approval RPC expects `seller_applications`, which is created only by the core root migration.

3. The older `0001_marketplace.sql` signup trigger derives the initial `role` from user-controlled `raw_user_meta_data.role`. The core migration correctly creates every new account as a customer and stores seller intent as a pending application. The safer behavior must be retained.

4. `0004_delivery_otp.sql` depends on `order_items` and `profiles`; it creates an OTP table with RLS enabled and no client grants. It still needs trusted server-side issue/verify functions, expiry enforcement, attempt limiting and replay tests.

5. `0005_financial_ledger.sql`, `0006_financial_reporting.sql`, and `0008_promotions_and_coupons.sql` are later foundations, not proof of a functioning checkout, payment, refund, payout or promotion engine. They must be checked against the final canonical schema before application.

6. Repository paths `0003_delivery_proof.sql` and `0007_order_cancellation.sql` could not be fetched at audit time (GitHub returned 404). Their existence and behavior are unverified; do not assume delivery proof or cancellation workflows are implemented.

7. `package.json` uses `latest` for Next.js, React and React DOM. This makes future dependency resolution non-deterministic. A lockfile reconciliation and pinned, mutually compatible versions are required before release.

## Required remediation sequence

1. Confirm whether this repository has ever had migrations applied to a Supabase project. Obtain the migration history from the project without exposing service-role secrets.
2. Choose one canonical baseline based on the actual deployed database, not by filename preference. Preserve production data and existing auth users.
3. Create a numbered, forward-only reconciliation migration for already-deployed environments, and a separately verified clean-install path if needed. Never rewrite applied migrations.
4. Retain least-privilege account creation: every signup is a customer; seller onboarding creates a pending application; only an authorized admin operation may approve and promote a seller.
5. Reconcile table/column names and constraints used by delivery, cancellation, finance and promotions.
6. Add automated SQL tests for RLS boundaries, seller approval, order state transitions, ledger balancing/idempotency, coupon concurrency, OTP expiry/attempt limits and cancellation/refund behavior.
7. Pin runtime dependencies, regenerate the lockfile using the supported Node/npm toolchain, then run lint, typecheck, production build and end-to-end tests.
8. Apply to staging first, run migration and workflow tests against a disposable database, then schedule production deployment with backup and rollback plan.

## Release blockers

- Actual Supabase migration history and deployed schema have not been inspected.
- No verified payment provider, payment webhook, refund or seller payout integration.
- No confirmed shipping carrier integration or delivery-proof workflow.
- No verified China supplier feed/API, written authorization, DDP terms or importer-of-record arrangement.
- No complete cart/checkout/order/admin experience or iOS application verified.
- No end-to-end or security test evidence for the current deployed site.

## Commercial and compliance decision gate

For the China supplier model, inventory remains supplier-owned and supplier-fulfilled; J&M does not warehouse or ship the goods. The agreed pricing proposal is a 15% markup on a supplier all-in delivered cost, not a 15% gross margin. Do not publish landed-cost promises until the supplier contract identifies the importer, customs/VAT responsibility, delivery charges, returns and who issues the customer invoice.

ZATCA's Digital Economy guidance distinguishes advertising/referral activity from platforms that facilitate supplies. The actual ordering, payment and contractual flow—not the label in a contract—must be reviewed by a Saudi tax adviser before an integrated marketplace checkout is enabled. Current official reference: https://www.zatca.gov.sa/en/HelpCenter/guidelines/Documents/VAT_Digital_Economy_Guidebook_Egnlish.pdf

## Audit conclusion

Do not run the current migration directory against production. The next engineering step is schema-history discovery and reconciliation, not another feature migration.
