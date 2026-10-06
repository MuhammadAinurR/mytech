CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'sent', 'paid');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"tax_id" text,
	"email" text,
	"default_currency" char(3) NOT NULL,
	"payment_details" text,
	"invoice_prefix" text DEFAULT 'INV-' NOT NULL,
	"next_invoice_number" integer DEFAULT 1 NOT NULL,
	"logo" "bytea",
	"logo_mime" text,
	"logo_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_length" CHECK (length(btrim("companies"."name")) between 1 and 160),
	CONSTRAINT "companies_address_length" CHECK ("companies"."address" is null or length("companies"."address") <= 1000),
	CONSTRAINT "companies_tax_id_length" CHECK ("companies"."tax_id" is null or length("companies"."tax_id") <= 64),
	CONSTRAINT "companies_email_length" CHECK ("companies"."email" is null or length("companies"."email") <= 254),
	CONSTRAINT "companies_currency_format" CHECK ("companies"."default_currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "companies_payment_details_length" CHECK ("companies"."payment_details" is null or length("companies"."payment_details") <= 1000),
	CONSTRAINT "companies_invoice_prefix_format" CHECK ("companies"."invoice_prefix" ~ '^[A-Za-z0-9/_-]{0,12}$'),
	CONSTRAINT "companies_next_number_positive" CHECK ("companies"."next_invoice_number" >= 1),
	CONSTRAINT "companies_logo_complete" CHECK (("companies"."logo" is null and "companies"."logo_mime" is null) or ("companies"."logo" is not null and "companies"."logo_mime" is not null and "companies"."logo_mime" in ('image/png', 'image/jpeg', 'image/webp'))),
	CONSTRAINT "companies_logo_size" CHECK ("companies"."logo" is null or octet_length("companies"."logo") <= 524288)
);
--> statement-breakpoint
CREATE TABLE "invoice_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"description" text NOT NULL,
	"quantity_milli" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"line_total_minor" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_items_position_range" CHECK ("invoice_items"."position" between 0 and 199),
	CONSTRAINT "invoice_items_description_length" CHECK (length(btrim("invoice_items"."description")) between 1 and 500),
	CONSTRAINT "invoice_items_quantity_positive" CHECK ("invoice_items"."quantity_milli" > 0),
	CONSTRAINT "invoice_items_price_non_negative" CHECK ("invoice_items"."unit_price_minor" >= 0),
	CONSTRAINT "invoice_items_total_non_negative" CHECK ("invoice_items"."line_total_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"number_label" text NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"issue_date" date NOT NULL,
	"due_date" date NOT NULL,
	"currency" char(3) NOT NULL,
	"client_name" text NOT NULL,
	"client_address" text,
	"client_email" text,
	"client_tax_id" text,
	"notes" text,
	"tax_rate_bps" integer DEFAULT 0 NOT NULL,
	"discount_minor" bigint DEFAULT 0 NOT NULL,
	"subtotal_minor" bigint NOT NULL,
	"tax_minor" bigint NOT NULL,
	"total_minor" bigint NOT NULL,
	"sent_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_number_positive" CHECK ("invoices"."number" >= 1),
	CONSTRAINT "invoices_due_after_issue" CHECK ("invoices"."due_date" >= "invoices"."issue_date"),
	CONSTRAINT "invoices_currency_format" CHECK ("invoices"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "invoices_client_name_length" CHECK (length(btrim("invoices"."client_name")) between 1 and 160),
	CONSTRAINT "invoices_notes_length" CHECK ("invoices"."notes" is null or length("invoices"."notes") <= 2000),
	CONSTRAINT "invoices_tax_rate_range" CHECK ("invoices"."tax_rate_bps" between 0 and 10000),
	CONSTRAINT "invoices_amounts_valid" CHECK ("invoices"."subtotal_minor" >= 0 and "invoices"."discount_minor" >= 0 and "invoices"."discount_minor" <= "invoices"."subtotal_minor" and "invoices"."tax_minor" >= 0),
	CONSTRAINT "invoices_total_consistent" CHECK ("invoices"."total_minor" = "invoices"."subtotal_minor" - "invoices"."discount_minor" + "invoices"."tax_minor"),
	CONSTRAINT "invoices_status_timestamps" CHECK (("invoices"."status" = 'draft' and "invoices"."sent_at" is null and "invoices"."paid_at" is null) or ("invoices"."status" = 'sent' and "invoices"."sent_at" is not null and "invoices"."paid_at" is null) or ("invoices"."status" = 'paid' and "invoices"."sent_at" is not null and "invoices"."paid_at" is not null))
);
--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "companies_user_name_idx" ON "companies" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_items_invoice_position_key" ON "invoice_items" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE INDEX "invoice_items_user_idx" ON "invoice_items" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_company_number_key" ON "invoices" USING btree ("company_id","number");--> statement-breakpoint
CREATE INDEX "invoices_user_issue_idx" ON "invoices" USING btree ("user_id","issue_date" DESC NULLS LAST,"number" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "invoices_user_status_idx" ON "invoices" USING btree ("user_id","status","due_date");--> statement-breakpoint
CREATE INDEX "invoices_company_idx" ON "invoices" USING btree ("company_id");