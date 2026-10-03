# J&M — China Direct-Fulfillment Specification

Status: planning specification only. This document does not activate supplier integrations, customs clearance, payments, or customer-facing products. Commercial model clarified: J&M is the marketing/sales storefront; the supplier owns and holds the goods and performs picking, packing, dispatch and delivery directly to the Saudi customer. J&M does not buy or warehouse stock and does not operate its own shipping fleet.

## Commercial decisions

- Fulfillment model: supplier owns/holds stock and handles picking, packing, export, shipping, customs/delivery arrangements and delivery directly to the Saudi customer. J&M is the storefront/marketing and order-routing intermediary; it does not buy inventory, warehouse goods, or ship parcels itself.
- Supplier relationship must be documented: confirm whether J&M is an agent/marketing intermediary earning commission, or the merchant/reseller collecting the customer's payment and purchasing fulfillment from the supplier. This contractual distinction determines invoicing, consumer obligations, tax treatment and importer-of-record responsibilities; do not assume J&M is the importer.
- Customer promise: one final SAR price at checkout; no surprise collection at the door. This promise may be displayed only after the carrier/supplier confirms a delivered-duty-paid (DDP) or otherwise fully prepaid arrangement and identifies the importer of record.
- J&M pricing rule: add 15% to the supplier's confirmed all-in customer-delivered quote (supplier discounted product price plus all supplier-managed shipping, customs, tax, clearance and last-mile charges). If the supplier quote excludes any of these, the missing charges must be quoted and contractually allocated before pricing.
- Formula: J&M displayed price = supplier all-in delivered quote × 1.15, with payment costs and any J&M-borne costs checked separately before publication. Do not double-count duties/tax already included in the supplier quote. Tax invoice treatment and output VAT must be determined from the signed agency/reseller structure and J&M's registration.
- Example: supplier's confirmed all-in delivered quote SAR 120 => J&M target price SAR 138. This is a 15% markup on cost, not a 15% gross margin on selling price.
- Never publish a product if supplier's delivered quote, stock, discount evidence, delivery responsibility or return terms are unknown, or expected contribution after J&M-borne costs is negative.

## Product sourcing and promotion qualification

A product can enter the J&M review queue only when:
1. Supplier identity and business contact have been verified.
2. An authorized API, affiliate feed, supplier feed, or written data permission is available. Do not scrape or republish content without permission.
3. Supplier SKU, variant identifiers, currency, stock, discounted price, list/reference price, product dimensions/weight, country of origin, shipping method, lead time, and return terms are supplied.
4. Discount is checked against a reliable supplier price history or independently captured prior price; never present an unverified reference price as a genuine discount.
5. Product category is checked for Saudi import restrictions, conformity approvals, labeling, and intellectual-property risk.
6. Images and descriptions have reuse rights or are recreated lawfully.

## Catalog and sync states

```text
discovered -> supplier_verified -> compliance_review -> landed_cost_verified
           -> approved -> published -> paused / out_of_stock / supplier_unavailable
```

- Supplier stock and price sync must be scheduled and event-driven where supported.
- On stock=0, supplier API failure beyond the configured freshness window, or material landed-cost increase: automatically pause checkout and mark the offer unavailable until revalidated.
- Save each supplier price/stock snapshot with timestamp and source reference for audit.
- Never silently change the price of an already-paid order. Reconcile supplier changes before payment authorization; after payment, honor the order or follow the disclosed cancellation/refund policy.

## Required data model (implementation target)

- supplier_connections: supplier, integration type, credentials secret reference (never raw secrets in DB/client), API status, sync schedule, terms/permission evidence.
- supplier_products: supplier SKU, supplier product/variant IDs, source URL, permitted content references, source currency, list price, discounted price, stock, weight/dimensions, origin, shipping promise, return policy, last sync.
- landed_cost_quotes: product/variant, quote timestamp, FX rate/source, supplier cost, freight, insurance, duty estimate, import VAT treatment, clearance, last mile, payment/FX fees, returns reserve, total landed cost, expiry, quote evidence.
- imported_catalog_items: internal product ID, supplier SKU/variant, approval state, displayed price, markup rate (default 0.15), cost quote ID, price lock/version.
- supplier_fulfillment_orders: J&M order/item, supplier order ID, purchase amount, ship-to reference, status, tracking number, carrier, importer of record, DDP evidence, timestamps, idempotency key.
- supplier_sync_events: immutable event log for stock, price, API errors, and order status changes.

## Order lifecycle

1. Revalidate supplier stock, exact variant, shipping eligibility, landed-cost quote and DDP terms at checkout.
2. Reserve supplier stock / create supplier order only through a trusted server integration with idempotency.
3. Confirm payment before submitting the purchase, according to the selected payment provider's authorization/capture flow.
4. Persist supplier confirmation and external order ID; if supplier order creation fails, void/refund customer payment and notify accurately.
5. Ingest carrier tracking updates; show clear China-to-Saudi milestones and realistic delivery range.
6. Confirm delivery using carrier proof plus customer OTP or equivalent evidence; a carrier scan alone is not sufficient for J&M's delivery confirmation rule.
7. Handle cancellation, return, refund, chargeback, lost parcel, damaged goods, and supplier dispute states without claiming success until the payment/carrier provider confirms it.

## Saudi import and compliance gates

- Supplier must contractually arrange the import/customs clearance and delivery directly to the customer, and identify the importer of record for each shipment. J&M must not be described as importer unless it is actually named and legally responsible.
- For the no-extra-payment-at-door promise, require written supplier/carrier terms confirming all import duties, VAT, clearance and delivery charges are prepaid (e.g. DDP where appropriate). If the carrier may collect from the recipient, do not publish the promise.
- Commercial imports require the applicable commercial invoice, bill of lading/air waybill, origin evidence where required, customs declaration and product-specific permits/certificates. Verify the current product tariff and regulatory requirements before listing.
- Do not apply personal-shipment customs exemptions to a commercial marketplace model.
- Confirm VAT treatment with a Saudi tax adviser based on the legal seller and importer-of-record structure. Import VAT may be recoverable only where statutory conditions are met; do not count recoverable input VAT as a permanent product cost, and do not omit customer-facing VAT obligations.
- Exclude counterfeit, prohibited, restricted, unsafe, and non-compliant goods. Keep supplier invoices, origin and conformity documents, and shipment declarations for audit.

## Admin controls and customer display

- Admin-only supplier onboarding, credential configuration, product review, compliance evidence, margin override, and emergency pause.
- Default markup 15%; any override requires a reason, user ID, timestamp, and audit event.
- Display final SAR price, accurate discount evidence, shipping estimate, returns terms, and an explicit statement that import/delivery charges are prepaid only when contractually verified.
- Do not expose supplier API keys, wholesale costs, private supplier URLs, or importer credentials to the browser.
- Keep J&M closed to public sales until end-to-end tests pass.

## Go-live acceptance checklist

- A real supplier grants API/feed access and permission to use catalog data and images.
- Supplier contract confirms direct-to-customer shipping to Saudi Arabia, service levels, returns, lost/damaged parcel responsibility, and DDP/importer-of-record arrangement.
- Saudi import licensing, product-category compliance, tax treatment, and customs broker arrangements are verified.
- Server-side integration handles authentication, rate limits, retries, idempotency, webhook signatures, secret storage, and audit logs.
- Automated tests cover price calculation, expired quotes, FX changes, stock races, duplicate orders, supplier failure, customs fees, cancellation, refund, returns, and delivery proof.
- Staging pilot with real but controlled shipments is completed; reconciliation confirms no hidden recipient charges.
- Security review and performance tests pass before public launch.

## Blocking dependencies (not yet supplied)

- Selected supplier(s) and official API/feed documentation.
- Supplier authorization/contract and image/content usage permission.
- Carrier/forwarder quote and written DDP/importer-of-record terms for Saudi deliveries.
- J&M legal seller/importer details and tax adviser confirmation.
- Product category shortlist for initial compliance review.
