CREATE TYPE "public"."application_status" AS ENUM('new', 'applied', 'interview', 'offer', 'rejected', 'skipped');--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "status" "application_status" DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "postings" ADD COLUMN "status_changed_at" timestamp with time zone;