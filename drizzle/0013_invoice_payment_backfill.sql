-- Invoices paid before payments were recorded as income get their entry now:
-- one per paid invoice with a positive total, dated the day it was marked paid
-- in its owner's timezone, under the category the app uses for invoice
-- payments. The app keeps these in sync from here on. Safe to run twice.
INSERT INTO "transactions" ("user_id", "type", "amount_minor", "currency", "category", "occurred_on", "invoice_id")
SELECT i."user_id", 'income', i."total_minor", i."currency", 'Invoices', (i."paid_at" AT TIME ZONE u."timezone")::date, i."id"
FROM "invoices" i
JOIN "users" u ON u."id" = i."user_id"
WHERE i."status" = 'paid' AND i."total_minor" > 0
ON CONFLICT ("invoice_id") DO NOTHING;
