CREATE TABLE "invoice_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"file_name" text NOT NULL,
	"object_key" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"page_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_attachments_position_range" CHECK ("invoice_attachments"."position" between 0 and 199),
	CONSTRAINT "invoice_attachments_file_name_length" CHECK (length(btrim("invoice_attachments"."file_name")) between 1 and 200),
	CONSTRAINT "invoice_attachments_size_range" CHECK ("invoice_attachments"."size_bytes" between 1 and 10485760),
	CONSTRAINT "invoice_attachments_page_count_range" CHECK ("invoice_attachments"."page_count" between 1 and 200),
	CONSTRAINT "invoice_attachments_object_key_format" CHECK ("invoice_attachments"."object_key" ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$')
);
--> statement-breakpoint
ALTER TABLE "invoice_attachments" ADD CONSTRAINT "invoice_attachments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_attachments" ADD CONSTRAINT "invoice_attachments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_attachments_invoice_position_key" ON "invoice_attachments" USING btree ("invoice_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_attachments_object_key_key" ON "invoice_attachments" USING btree ("object_key");--> statement-breakpoint
CREATE INDEX "invoice_attachments_user_idx" ON "invoice_attachments" USING btree ("user_id");