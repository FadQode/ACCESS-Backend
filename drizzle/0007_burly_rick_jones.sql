CREATE TYPE "public"."social_complaint_source" AS ENUM('google_play', 'facebook', 'x');--> statement-breakpoint
CREATE TABLE "social_complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "social_complaint_source" NOT NULL,
	"source_reference" text NOT NULL,
	"content" text NOT NULL,
	"author" varchar(255),
	"source_url" text,
	"published_at" timestamp with time zone NOT NULL,
	"metadata" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "social_complaints_source_reference_unique" UNIQUE("source","source_reference")
);
--> statement-breakpoint
ALTER TABLE "complaints" ADD COLUMN "social_complaint_id" uuid;--> statement-breakpoint
CREATE INDEX "social_complaints_source_published_at_idx" ON "social_complaints" USING btree ("source","published_at");--> statement-breakpoint
CREATE INDEX "social_complaints_published_at_idx" ON "social_complaints" USING btree ("published_at");--> statement-breakpoint
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_social_complaint_id_social_complaints_id_fk" FOREIGN KEY ("social_complaint_id") REFERENCES "public"."social_complaints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "complaints_social_complaint_id_idx" ON "complaints" USING btree ("social_complaint_id");