# 0012. A paid invoice records its payment as a transaction

- Status: accepted
- Date: 2026-10-28

## Context

Money in and out is read from one place: the transactions table. The
dashboard's month summary and chart, the Transactions page, and its search all
sum or list transactions. Invoices kept their own status, so marking one paid
changed nothing there: the income a client paid never showed up, unless the
owner retyped it as a transaction (and then it could be counted twice).

## Decision

- **One ledger entry per paid invoice.** `transactions.invoice_id` links an
  income entry to the invoice whose payment it records, under a unique index.
  It is income only and never also from a recurring rule (CHECKs).
- **The invoice owns it.** `syncPayment` runs inside the same database
  transaction as every status change and edit. A paid invoice with a positive
  total has an entry for its total and currency. Any other invoice (draft,
  sent, or a zero total) has none. Undoing "paid" removes the entry; an edit
  moves the amount and currency.
- **Dated when marked paid,** in the owner's timezone (`paid_at` as a date).
  Later edits keep that date.
- **Read-only in Transactions.** Editing or deleting the entry there returns
  `invoice_payment`, and the UI points to the invoice instead.
- **Backfill.** Migration 0013 records invoices paid before this change, with
  the same rules. It skips any that already have an entry.

## Consequences

- Every view that reads transactions counts invoice income with no extra
  queries or unions, and in the invoice's own currency (no FX, per ADR 0002).
- A payment received before the day it was marked paid lands on the marking
  day, and nothing changes that date yet. Choosing a payment date when marking
  paid is the natural follow-up.
- If an owner had already typed an invoice's payment in by hand, that entry now
  doubles it and should be deleted.
