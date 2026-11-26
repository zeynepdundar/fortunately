CREATE TABLE "profiles" (
	"workspace_id" uuid PRIMARY KEY NOT NULL,
	"years_of_experience" integer,
	"target_countries" text[] DEFAULT '{}' NOT NULL,
	"relocation_needed" boolean DEFAULT false NOT NULL,
	"active_cv_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_active_cv_id_cvs_id_fk" FOREIGN KEY ("active_cv_id") REFERENCES "public"."cvs"("id") ON DELETE set null ON UPDATE no action;