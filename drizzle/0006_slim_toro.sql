CREATE TYPE "public"."holiday_category" AS ENUM('lebaran', 'nataru', 'imlek', 'other_long_holiday', 'regular_holiday');--> statement-breakpoint
CREATE TYPE "public"."holiday_source" AS ENUM('skb_3_menteri', 'manual');--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"category" "holiday_category" NOT NULL,
	"is_joint_leave" boolean DEFAULT false NOT NULL,
	"source" "holiday_source" DEFAULT 'manual' NOT NULL,
	"source_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "holidays_date_source_unique" UNIQUE("date","source")
);
--> statement-breakpoint
CREATE INDEX "holidays_date_idx" ON "holidays" USING btree ("date");