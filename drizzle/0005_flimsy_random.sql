CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reference_source_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_source_id" uuid NOT NULL REFERENCES "public"."reference_sources"("id") ON DELETE cascade ON UPDATE no action,
	"embedded_text" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"model_name" text NOT NULL,
	"embedding_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reference_source_embeddings_source_model_version_unique" UNIQUE("reference_source_id","model_name","embedding_version")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resolved_case_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"complaint_id" uuid NOT NULL REFERENCES "public"."complaints"("id") ON DELETE cascade ON UPDATE no action,
	"quick_response_session_id" uuid NOT NULL REFERENCES "public"."quick_response_sessions"("id") ON DELETE cascade ON UPDATE no action,
	"embedded_text" text NOT NULL,
	"embedding" vector(384) NOT NULL,
	"model_name" text NOT NULL,
	"embedding_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resolved_case_embeddings_case_session_model_version_unique" UNIQUE("complaint_id","quick_response_session_id","model_name","embedding_version")
);
--> statement-breakpoint
ALTER TABLE "reference_source_embeddings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "resolved_case_embeddings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reference_source_embeddings_embedding_idx"
ON "reference_source_embeddings"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "resolved_case_embeddings_embedding_idx"
ON "resolved_case_embeddings"
USING ivfflat ("embedding" vector_cosine_ops)
WITH (lists = 100);
