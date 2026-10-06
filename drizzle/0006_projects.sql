CREATE TYPE "public"."project_status" AS ENUM('todo', 'ongoing', 'done');--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "project_status" DEFAULT 'todo' NOT NULL,
	"start_date" date,
	"end_date" date,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_name_length" CHECK (length(btrim("projects"."name")) between 1 and 160),
	CONSTRAINT "projects_description_length" CHECK ("projects"."description" is null or length("projects"."description") <= 2000),
	CONSTRAINT "projects_position_non_negative" CHECK ("projects"."position" >= 0),
	CONSTRAINT "projects_ongoing_has_dates" CHECK ("projects"."status" <> 'ongoing' or ("projects"."start_date" is not null and "projects"."end_date" is not null)),
	CONSTRAINT "projects_end_after_start" CHECK ("projects"."start_date" is null or "projects"."end_date" is null or "projects"."end_date" >= "projects"."start_date")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "projects_user_board_idx" ON "projects" USING btree ("user_id","status","position");--> statement-breakpoint
CREATE INDEX "projects_user_dates_idx" ON "projects" USING btree ("user_id","start_date","end_date");