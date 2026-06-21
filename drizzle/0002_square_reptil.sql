ALTER TABLE "action_requests" ADD COLUMN "issue_key" varchar(160) DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "action_requests" ADD COLUMN "grouping_key" varchar(220) DEFAULT 'general:general' NOT NULL;--> statement-breakpoint
CREATE INDEX "action_request_complaints_linked_at_idx" ON "action_request_complaints" USING btree ("linked_at");--> statement-breakpoint
CREATE INDEX "action_requests_issue_key_idx" ON "action_requests" USING btree ("issue_key");--> statement-breakpoint
CREATE INDEX "action_requests_grouping_key_idx" ON "action_requests" USING btree ("grouping_key");--> statement-breakpoint
CREATE INDEX "action_requests_created_at_idx" ON "action_requests" USING btree ("created_at");