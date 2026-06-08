CREATE TYPE "public"."action_request_status" AS ENUM('open', 'reviewing', 'action_planned', 'action_taken', 'closed');--> statement-breakpoint
CREATE TYPE "public"."complaint_category" AS ENUM('delay', 'refund', 'cancellation', 'lost_item', 'facility', 'payment', 'account', 'app_error', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_source" AS ENUM('web_form', 'twitter', 'instagram', 'facebook', 'google_play', 'app_store', 'other');--> statement-breakpoint
CREATE TYPE "public"."complaint_status" AS ENUM('submitted', 'triaged', 'linked_to_ticket', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('active', 'draft', 'archived');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('sop', 'faq', 'policy', 'guide', 'template', 'known_issue');--> statement-breakpoint
CREATE TYPE "public"."quick_response_outcome" AS ENUM('sent_resolved', 'sent_hea_action', 'saved_ticket', 'escalated', 'copy_only');--> statement-breakpoint
CREATE TYPE "public"."response_target" AS ENUM('public_reply', 'dm', 'app_review', 'internal_note');--> statement-breakpoint
CREATE TYPE "public"."ticket_event_type" AS ENUM('created', 'assigned', 'hea_sent', 'escalated', 'manager_action_linked', 'resolved', 'closed', 'reopened');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('open', 'hea_sent', 'waiting_manager_action', 'manager_action_done', 'ready_to_close', 'closed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('agent', 'manager', 'admin');--> statement-breakpoint
CREATE TABLE "action_request_complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action_request_id" uuid NOT NULL,
	"complaint_id" uuid NOT NULL,
	"ticket_id" uuid,
	"agent_id" uuid,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_request_complaints_request_complaint_unique" UNIQUE("action_request_id","complaint_id")
);
--> statement-breakpoint
CREATE TABLE "action_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"manager_id" uuid,
	"reference_no" varchar(64) NOT NULL,
	"cluster_label" varchar(255),
	"category" "complaint_category" NOT NULL,
	"status" "action_request_status" DEFAULT 'open' NOT NULL,
	"issue_summary" text NOT NULL,
	"action_taken" text,
	"closure_message" text,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"period_month" integer NOT NULL,
	"period_year" integer NOT NULL,
	"complaints_resolved" integer DEFAULT 0 NOT NULL,
	"escalations_count" integer DEFAULT 0 NOT NULL,
	"avg_first_response_min" numeric(10, 2),
	"avg_resolution_hrs" numeric(10, 2),
	"quality_score" numeric(5, 2),
	"compliance_responded_before_action" numeric(5, 2),
	"compliance_referenced_issue" numeric(5, 2),
	"compliance_action_on_close" numeric(5, 2),
	"compliance_first_reply_under_1h" numeric(5, 2),
	"compliance_no_sla_breach" numeric(5, 2),
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_performance_agent_period_unique" UNIQUE("agent_id","period_month","period_year"),
	CONSTRAINT "agent_performance_period_month_check" CHECK ("agent_performance"."period_month" between 1 and 12),
	CONSTRAINT "agent_performance_period_year_check" CHECK ("agent_performance"."period_year" between 2000 and 9999),
	CONSTRAINT "agent_performance_complaints_resolved_check" CHECK ("agent_performance"."complaints_resolved" >= 0),
	CONSTRAINT "agent_performance_escalations_count_check" CHECK ("agent_performance"."escalations_count" >= 0),
	CONSTRAINT "agent_performance_avg_first_response_check" CHECK ("agent_performance"."avg_first_response_min" is null or "agent_performance"."avg_first_response_min" >= 0),
	CONSTRAINT "agent_performance_avg_resolution_check" CHECK ("agent_performance"."avg_resolution_hrs" is null or "agent_performance"."avg_resolution_hrs" >= 0),
	CONSTRAINT "agent_performance_quality_score_check" CHECK ("agent_performance"."quality_score" is null or "agent_performance"."quality_score" between 0 and 100),
	CONSTRAINT "agent_performance_responded_before_action_check" CHECK ("agent_performance"."compliance_responded_before_action" is null or "agent_performance"."compliance_responded_before_action" between 0 and 100),
	CONSTRAINT "agent_performance_referenced_issue_check" CHECK ("agent_performance"."compliance_referenced_issue" is null or "agent_performance"."compliance_referenced_issue" between 0 and 100),
	CONSTRAINT "agent_performance_action_on_close_check" CHECK ("agent_performance"."compliance_action_on_close" is null or "agent_performance"."compliance_action_on_close" between 0 and 100),
	CONSTRAINT "agent_performance_first_reply_under_1h_check" CHECK ("agent_performance"."compliance_first_reply_under_1h" is null or "agent_performance"."compliance_first_reply_under_1h" between 0 and 100),
	CONSTRAINT "agent_performance_no_sla_breach_check" CHECK ("agent_performance"."compliance_no_sla_breach" is null or "agent_performance"."compliance_no_sla_breach" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" varchar(100) NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_no" varchar(64) NOT NULL,
	"tracking_token" varchar(128) NOT NULL,
	"source" "complaint_source" NOT NULL,
	"source_handle" varchar(255),
	"source_url" text,
	"complainer_name" varchar(160),
	"complainer_contact" varchar(255),
	"category" "complaint_category" NOT NULL,
	"complaint_text" text NOT NULL,
	"status" "complaint_status" DEFAULT 'submitted' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_document_tags" (
	"context_document_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "context_document_tags_pk" PRIMARY KEY("context_document_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "context_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"doc_type" "document_type" NOT NULL,
	"category" "complaint_category" NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"version" varchar(32) DEFAULT '1.0' NOT NULL,
	"content" text NOT NULL,
	"search_text" text,
	"file_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"context_document_id" uuid NOT NULL,
	"ticket_id" uuid,
	"quick_response_session_id" uuid,
	"referenced_by" uuid NOT NULL,
	"reference_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_references_has_target" CHECK ("document_references"."ticket_id" is not null or "document_references"."quick_response_session_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "document_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quick_response_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"complaint_id" uuid NOT NULL,
	"ticket_id" uuid,
	"source_channel" "complaint_source" NOT NULL,
	"source_handle" varchar(255),
	"response_tone" varchar(80),
	"response_target" "response_target" NOT NULL,
	"selected_hear" text,
	"selected_empathize" text,
	"selected_apologize" text,
	"selected_take_action" text,
	"final_response" text,
	"outcome" "quick_response_outcome",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"actor_id" uuid,
	"event_type" "ticket_event_type" NOT NULL,
	"note" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL,
	"agent_id" uuid,
	"status" "ticket_status" DEFAULT 'open' NOT NULL,
	"priority" "ticket_priority" DEFAULT 'medium' NOT NULL,
	"hea_response" text,
	"hea_sent_at" timestamp with time zone,
	"closure_message" text,
	"closure_sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_request_complaints" ADD CONSTRAINT "action_request_complaints_action_request_id_action_requests_id_fk" FOREIGN KEY ("action_request_id") REFERENCES "public"."action_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_request_complaints" ADD CONSTRAINT "action_request_complaints_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_request_complaints" ADD CONSTRAINT "action_request_complaints_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_request_complaints" ADD CONSTRAINT "action_request_complaints_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_requests" ADD CONSTRAINT "action_requests_manager_id_users_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_performance" ADD CONSTRAINT "agent_performance_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_document_tags" ADD CONSTRAINT "context_document_tags_context_document_id_context_documents_id_fk" FOREIGN KEY ("context_document_id") REFERENCES "public"."context_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_document_tags" ADD CONSTRAINT "context_document_tags_tag_id_document_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."document_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_documents" ADD CONSTRAINT "context_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_context_document_id_context_documents_id_fk" FOREIGN KEY ("context_document_id") REFERENCES "public"."context_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_quick_response_session_id_quick_response_sessions_id_fk" FOREIGN KEY ("quick_response_session_id") REFERENCES "public"."quick_response_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_references" ADD CONSTRAINT "document_references_referenced_by_users_id_fk" FOREIGN KEY ("referenced_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_response_sessions" ADD CONSTRAINT "quick_response_sessions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_response_sessions" ADD CONSTRAINT "quick_response_sessions_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quick_response_sessions" ADD CONSTRAINT "quick_response_sessions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_complaint_id_complaints_id_fk" FOREIGN KEY ("complaint_id") REFERENCES "public"."complaints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_request_complaints_action_request_id_idx" ON "action_request_complaints" USING btree ("action_request_id");--> statement-breakpoint
CREATE INDEX "action_request_complaints_complaint_id_idx" ON "action_request_complaints" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "action_request_complaints_ticket_id_idx" ON "action_request_complaints" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "action_request_complaints_agent_id_idx" ON "action_request_complaints" USING btree ("agent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "action_requests_reference_no_unique" ON "action_requests" USING btree ("reference_no");--> statement-breakpoint
CREATE INDEX "action_requests_manager_id_idx" ON "action_requests" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "action_requests_category_idx" ON "action_requests" USING btree ("category");--> statement-breakpoint
CREATE INDEX "action_requests_status_idx" ON "action_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "action_requests_raised_at_idx" ON "action_requests" USING btree ("raised_at");--> statement-breakpoint
CREATE INDEX "agent_performance_agent_id_idx" ON "agent_performance" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_type_idx" ON "audit_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_id_idx" ON "audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "complaints_reference_no_unique" ON "complaints" USING btree ("reference_no");--> statement-breakpoint
CREATE UNIQUE INDEX "complaints_tracking_token_unique" ON "complaints" USING btree ("tracking_token");--> statement-breakpoint
CREATE INDEX "complaints_source_idx" ON "complaints" USING btree ("source");--> statement-breakpoint
CREATE INDEX "complaints_category_idx" ON "complaints" USING btree ("category");--> statement-breakpoint
CREATE INDEX "complaints_status_idx" ON "complaints" USING btree ("status");--> statement-breakpoint
CREATE INDEX "complaints_submitted_at_idx" ON "complaints" USING btree ("submitted_at");--> statement-breakpoint
CREATE INDEX "context_document_tags_tag_id_idx" ON "context_document_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "context_documents_uploaded_by_idx" ON "context_documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "context_documents_title_idx" ON "context_documents" USING btree ("title");--> statement-breakpoint
CREATE INDEX "context_documents_doc_type_idx" ON "context_documents" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "context_documents_category_idx" ON "context_documents" USING btree ("category");--> statement-breakpoint
CREATE INDEX "context_documents_status_idx" ON "context_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "document_references_context_document_id_idx" ON "document_references" USING btree ("context_document_id");--> statement-breakpoint
CREATE INDEX "document_references_ticket_id_idx" ON "document_references" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "document_references_quick_response_session_id_idx" ON "document_references" USING btree ("quick_response_session_id");--> statement-breakpoint
CREATE INDEX "document_references_referenced_by_idx" ON "document_references" USING btree ("referenced_by");--> statement-breakpoint
CREATE UNIQUE INDEX "document_tags_name_unique" ON "document_tags" USING btree ("name");--> statement-breakpoint
CREATE INDEX "quick_response_sessions_agent_id_idx" ON "quick_response_sessions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "quick_response_sessions_complaint_id_idx" ON "quick_response_sessions" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "quick_response_sessions_ticket_id_idx" ON "quick_response_sessions" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "quick_response_sessions_outcome_idx" ON "quick_response_sessions" USING btree ("outcome");--> statement-breakpoint
CREATE INDEX "quick_response_sessions_created_at_idx" ON "quick_response_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "ticket_events_ticket_id_idx" ON "ticket_events" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "ticket_events_actor_id_idx" ON "ticket_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "ticket_events_event_type_idx" ON "ticket_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "ticket_events_created_at_idx" ON "ticket_events" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tickets_complaint_id_unique" ON "tickets" USING btree ("complaint_id");--> statement-breakpoint
CREATE INDEX "tickets_agent_id_idx" ON "tickets" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "tickets_status_idx" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tickets_priority_idx" ON "tickets" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "tickets_created_at_idx" ON "tickets" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree ("email");