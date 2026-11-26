CREATE TYPE "public"."relocation_support" AS ENUM('yes', 'no', 'not_stated');--> statement-breakpoint
CREATE TYPE "public"."work_mode" AS ENUM('remote', 'hybrid', 'onsite');--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "job_title" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "company" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "work_mode" "work_mode";--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "relocation" "relocation_support";