CREATE TYPE "public"."credential_type" AS ENUM('server', 'domain', 'other');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" text NOT NULL,
	"type" "credential_type" NOT NULL,
	"host" text,
	"username" text,
	"secret_ciphertext" text NOT NULL,
	"secret_iv" text NOT NULL,
	"secret_tag" text NOT NULL,
	"key_version" smallint NOT NULL,
	"notes" text,
	"last_revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credentials_label_length" CHECK (length(btrim("credentials"."label")) between 1 and 120),
	CONSTRAINT "credentials_host_length" CHECK ("credentials"."host" is null or length("credentials"."host") <= 255),
	CONSTRAINT "credentials_username_length" CHECK ("credentials"."username" is null or length("credentials"."username") <= 255),
	CONSTRAINT "credentials_notes_length" CHECK ("credentials"."notes" is null or length("credentials"."notes") <= 2000),
	CONSTRAINT "credentials_key_version_positive" CHECK ("credentials"."key_version" > 0),
	CONSTRAINT "credentials_iv_size" CHECK (length("credentials"."secret_iv") = 16),
	CONSTRAINT "credentials_tag_size" CHECK (length("credentials"."secret_tag") = 24)
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_user_created_idx" ON "audit_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_entity_idx" ON "audit_events" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "credentials_user_label_idx" ON "credentials" USING btree ("user_id","label");--> statement-breakpoint
CREATE INDEX "credentials_user_type_idx" ON "credentials" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "credentials_key_version_idx" ON "credentials" USING btree ("key_version");