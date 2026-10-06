CREATE TYPE "public"."recurrence_frequency" AS ENUM('monthly', 'yearly');--> statement-breakpoint
CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	"category" text NOT NULL,
	"note" text,
	"frequency" "recurrence_frequency" NOT NULL,
	"day_of_month" smallint NOT NULL,
	"month_of_year" smallint,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"reminder_days_before" smallint,
	"generated_through" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_rules_label_length" CHECK (length(btrim("recurring_rules"."label")) between 1 and 120),
	CONSTRAINT "recurring_rules_amount_positive" CHECK ("recurring_rules"."amount_minor" > 0),
	CONSTRAINT "recurring_rules_currency_format" CHECK ("recurring_rules"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "recurring_rules_category_length" CHECK (length(btrim("recurring_rules"."category")) between 1 and 64),
	CONSTRAINT "recurring_rules_day_range" CHECK ("recurring_rules"."day_of_month" between 1 and 31),
	CONSTRAINT "recurring_rules_month_matches_frequency" CHECK (("recurring_rules"."frequency" = 'yearly' and "recurring_rules"."month_of_year" between 1 and 12) or ("recurring_rules"."frequency" = 'monthly' and "recurring_rules"."month_of_year" is null)),
	CONSTRAINT "recurring_rules_ends_after_start" CHECK ("recurring_rules"."ends_on" is null or "recurring_rules"."ends_on" >= "recurring_rules"."starts_on"),
	CONSTRAINT "recurring_rules_reminder_range" CHECK ("recurring_rules"."reminder_days_before" is null or "recurring_rules"."reminder_days_before" between 0 and 365)
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"rule_id" uuid NOT NULL,
	"occurrence_date" date NOT NULL,
	"remind_on" date NOT NULL,
	"dismissed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reminders_remind_before_due" CHECK ("reminders"."remind_on" <= "reminders"."occurrence_date")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurring_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "occurrence_date" date;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_rule_id_recurring_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."recurring_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_rules_user_idx" ON "recurring_rules" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "recurring_rules_active_idx" ON "recurring_rules" USING btree ("id") WHERE "recurring_rules"."is_active";--> statement-breakpoint
CREATE UNIQUE INDEX "reminders_rule_occurrence_key" ON "reminders" USING btree ("rule_id","occurrence_date");--> statement-breakpoint
CREATE INDEX "reminders_user_open_idx" ON "reminders" USING btree ("user_id","dismissed_at","occurrence_date");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_rule_id_recurring_rules_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "public"."recurring_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_rule_occurrence_key" ON "transactions" USING btree ("recurring_rule_id","occurrence_date");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_rule_has_occurrence" CHECK ("transactions"."recurring_rule_id" is null or "transactions"."occurrence_date" is not null);