CREATE TYPE "public"."invoice_reminder_kind" AS ENUM('upcoming', 'due', 'overdue');--> statement-breakpoint
CREATE TABLE "invoice_reminder_pushes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"kind" "invoice_reminder_kind" NOT NULL,
	"due_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"label" text,
	"last_success_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_format" CHECK ("push_subscriptions"."endpoint" ~ '^https://' and length("push_subscriptions"."endpoint") <= 2048),
	CONSTRAINT "push_subscriptions_keys_length" CHECK (length("push_subscriptions"."p256dh") between 1 and 256 and length("push_subscriptions"."auth") between 1 and 256),
	CONSTRAINT "push_subscriptions_label_length" CHECK ("push_subscriptions"."label" is null or length("push_subscriptions"."label") <= 120)
);
--> statement-breakpoint
ALTER TABLE "invoice_reminder_pushes" ADD CONSTRAINT "invoice_reminder_pushes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_reminder_pushes" ADD CONSTRAINT "invoice_reminder_pushes_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_reminder_pushes_key" ON "invoice_reminder_pushes" USING btree ("invoice_id","kind","due_date");--> statement-breakpoint
CREATE INDEX "invoice_reminder_pushes_user_idx" ON "invoice_reminder_pushes" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_idx" ON "push_subscriptions" USING btree ("user_id");