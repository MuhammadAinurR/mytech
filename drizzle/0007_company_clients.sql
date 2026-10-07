CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"email" text,
	"tax_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_name_length" CHECK (length(btrim("clients"."name")) between 1 and 160),
	CONSTRAINT "clients_address_length" CHECK ("clients"."address" is null or length("clients"."address") <= 1000),
	CONSTRAINT "clients_email_length" CHECK ("clients"."email" is null or length("clients"."email") <= 254),
	CONSTRAINT "clients_tax_id_length" CHECK ("clients"."tax_id" is null or length("clients"."tax_id") <= 64)
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clients_company_name_key" ON "clients" USING btree ("company_id",lower("name"));--> statement-breakpoint
CREATE INDEX "clients_user_idx" ON "clients" USING btree ("user_id");