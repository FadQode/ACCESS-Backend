ALTER TABLE "reference_sources" ADD COLUMN "storage_provider" varchar(64);--> statement-breakpoint
ALTER TABLE "reference_sources" ADD COLUMN "storage_bucket" varchar(255);--> statement-breakpoint
ALTER TABLE "reference_sources" ADD COLUMN "storage_key" text;--> statement-breakpoint
ALTER TABLE "reference_sources" ADD COLUMN "file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "reference_sources" ADD COLUMN "file_mime_type" varchar(255);--> statement-breakpoint
ALTER TABLE "reference_sources" ADD COLUMN "file_size" integer;--> statement-breakpoint
CREATE INDEX "reference_sources_storage_key_idx" ON "reference_sources" USING btree ("storage_key");