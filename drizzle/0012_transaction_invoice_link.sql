ALTER TABLE "transactions" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_invoice_key" ON "transactions" USING btree ("invoice_id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_invoice_is_income" CHECK ("transactions"."invoice_id" is null or "transactions"."type" = 'income');--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_single_source" CHECK ("transactions"."invoice_id" is null or "transactions"."recurring_rule_id" is null);