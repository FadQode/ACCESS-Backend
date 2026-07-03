CREATE TYPE "public"."quick_response_reference_selection_source" AS ENUM('agent_selected', 'manager_attached', 'system_suggested', 'auto_attached');--> statement-breakpoint
ALTER TYPE "public"."quick_response_reference_usage" ADD VALUE 'closure_support';--> statement-breakpoint
ALTER TABLE "quick_response_references" ADD COLUMN "selection_source" "quick_response_reference_selection_source" DEFAULT 'agent_selected' NOT NULL;--> statement-breakpoint
CREATE INDEX "quick_response_references_selection_source_idx" ON "quick_response_references" USING btree ("selection_source");--> statement-breakpoint
ALTER TABLE "action_request_references" ADD CONSTRAINT "action_request_references_request_source_unique" UNIQUE("action_request_id","reference_source_id");--> statement-breakpoint
ALTER TABLE "quick_response_references" ADD CONSTRAINT "quick_response_references_session_source_unique" UNIQUE("quick_response_session_id","reference_source_id");