# Booked Vendor → Budget: current architecture

**050003 is applied successfully to Frankfurt.** Isolated PostgreSQL execution, legacy adoption,
concurrency/rollback checks and authenticated read-only application verification passed before the
approved checkpoint. Earlier SQL Editor applications are not recorded in a reliable migration ledger.

## Ownership and retained history

`couple_vendors.status` + `agreed_price_minor` are booking facts; `is_saved` remains independent.
Booked plus a non-null price (including explicitly entered zero) produces one canonical linked
`budget_items` row with `source = booked_vendor`. Only the database trigger synchronizes its
commitment. Status/price actions never create Budget/payment rows themselves. Trigger failure rolls
back the relationship mutation, and the application presents a safe failure.

The same row survives price clearing, unbooking and rebooking. Commitment clears to NULL while
payment rows remain untouched. Existing non-null estimates and user metadata are retained; if
clearing commitment would leave a retained row without any amount, its previous commitment is kept
as an estimate (zero only when neither amount exists). This satisfies the existing amount constraint.

Ordinary Budget editing can change label, category, notes and estimate. It cannot change canonical
source, link or commitment. Manual expenses are independent: the former optional vendor selector
is removed, so it cannot duplicate or detach a canonical link. Safe Marketplace/External business
names appear in booking context. Change agreed price through Our Vendors.

Canonical items cannot be hard-deleted, even after payments are explicitly removed. Relationships
with linked items cannot be deleted, including cascade deletion of an External Vendor. Empty
saved-only placeholders remain removable. Any Budget item with payments is protected against
parent deletion. Separate, explicit payment editing/deletion remains a user correction facility.
Account/wedding hard deletion with financial history needs its own future reviewed workflow.

## Financial calculations and schedules

`calculateBudgetImpact(item)` returns commitment, scheduled total, actual paid, impact and two
reconciliation flags. `impact = max(commitment or zero, actual paid)`. Available is total minus
SUM(item impact); it is NOT total minus commitment alone or total minus commitment minus paid.
Remaining committed is computed per item before summing. An unknown total stays unknown.

Unbooked canonical expenses retain paid spending in Available. Their unpaid schedules remain visible
as inactive history and never appear as active upcoming obligations in Dashboard/Assistant reads.
Rebooking restores schedule activity. Clearing price while remaining Booked preserves schedules for
review, but a positive active commitment is required for new payment obligations. Paid/scheduled
amounts above commitment trigger review, not a fabricated refund or a rewrite of historical payments.

Payment INSERTs and amount increases lock the parent item with `FOR UPDATE` then validate the total.
The parent lock also serializes against commitment updates. At READ COMMITTED, the subsequent SUM
sees preceding committed writes; stricter isolation may require transaction retry. Schedule updates
cannot move payment IDs/parents. Existing amounts may be retained/reduced and historical flags/notes
corrected after unbooking or reduction. This permits reconciliation without permitting new excess
obligations. No trigger writes payment amounts or paid flags.

## Migration preflight and adoption

050003 has explicit BEGIN/COMMIT and write-excluding table locks. Any failure rolls back all DDL and
backfill. It refuses prior/partial named objects rather than silently replacing unknown definitions.
A full re-run also fails clearly; inspect schema instead of manipulating a missing ledger.

Preconditions reject duplicate links, invalid references/ownership/source identities, and existing
linked rows that are not uniquely attached to a currently Booked, priced, matching relationship.
No fuzzy matching or automatic merging occurs. Unrelated unlinked expenses remain manual.

The known live linked item qualifies for adoption: only its source classification changes (the
existing updated-at trigger may also update its timestamp). Its ID, differing estimate, label,
category, notes, commitment and payment history are preserved. Missing eligible canonical items,
if a refreshed preflight establishes any, are inserted without payments. Partial uniqueness ensures
one item per non-null relationship. New linked manual items are prohibited.

Historical application preflight: 1 wedding, 3 relationships, 1 priced booking, 1 linked expense, 1 payment, no duplicate
groups. Immediately after adopting that snapshot, Total ₪170,000 / Committed ₪100,000 / Paid ₪100,000 /
Available ₪70,000 were preserved. No specific live IDs or secrets are embedded in the migration.

## Application sequence — historical cutover and future fresh-database guidance

This sequence is complete for Frankfurt; do not reapply it. A future database requires its own review.

1. Review SQL and run a disposable PostgreSQL rehearsal, including actual two-connection concurrency
   and authenticated/cross-Couple RLS checks. Local source-contract tests do not prove these behaviors.
2. Refresh the read-only Frankfurt preflight and obtain a recovery backup/export through an approved
   process. Stop application writes during the coordinated cutover.
3. Apply the complete reviewed transaction manually, only after explicit approval. Do not run blind
   `supabase db push`, replay earlier migrations, or fabricate ledger entries.
4. Activate this application revision with the migration. It selects the new `source` column and has
   no application synchronization fallback, so **do not deploy/run financial flows from this revision
   against the old schema**. Conversely do not leave the old duplicate writer active after migration.
5. Verify canonical IDs/payment history, counts, ownership, constraints and unchanged snapshot totals
   using read-only checks. Perform any later mutation QA only with separate authorization.

Revalidation covers Budget, Wedding dashboard, Vendors/Our Vendors and existing Assistant consumers.
No AI feature/provider/tool registration changes or external services are introduced.

External Vendor business/contact editing retains the existing separate request from its relationship
write. The relationship and its canonical commitment are atomic together; a failed relationship
request may follow a successful business-metadata edit. The UI returns an error, not booking success.
Creating an External Vendor still attempts cleanup if its relationship creation fails. No new RPC
or orchestration transaction for those nonfinancial metadata operations is introduced in this phase.
