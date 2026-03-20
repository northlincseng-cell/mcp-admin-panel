CREATE TABLE "approval_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT '',
	"submitted_by" text DEFAULT '',
	"detail" text DEFAULT '',
	"priority" text DEFAULT 'normal',
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolved_by" text
);
--> statement-breakpoint
CREATE TABLE "c2050_streams" (
	"id" serial PRIMARY KEY NOT NULL,
	"stream" text NOT NULL,
	"frequency" text DEFAULT '',
	"source" text DEFAULT '',
	"status" text DEFAULT 'live',
	"last_update" text DEFAULT '',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "carbon_markets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"price" text DEFAULT '',
	"delta" text DEFAULT '',
	"trend_up" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "change_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" text NOT NULL,
	"section" text DEFAULT '',
	"detail" text DEFAULT '',
	"user_name" text DEFAULT 'system',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"flag" text DEFAULT '',
	"carbon_reference" text DEFAULT '',
	"gs_price" text DEFAULT '',
	"floor_price" text DEFAULT '',
	"compliance_framework" text DEFAULT '',
	"readiness" integer DEFAULT 0,
	"status" text DEFAULT 'planned' NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"country" text DEFAULT '',
	"flag" text DEFAULT '',
	"volume" text DEFAULT '',
	"price" text DEFAULT '',
	"level" integer DEFAULT 1,
	"score" integer DEFAULT 0,
	"status" text DEFAULT 'pending' NOT NULL,
	"type" text DEFAULT 'corporate',
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equivalence_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"dimension" text NOT NULL,
	"percentage" real DEFAULT 0,
	"gs_value" text DEFAULT '',
	"description" text DEFAULT '',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gs_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"tier_name" text NOT NULL,
	"price_per_gs" text DEFAULT '',
	"volume_range" text DEFAULT '',
	"discount_pct" text DEFAULT '',
	"description" text DEFAULT '',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sku" varchar(40) NOT NULL,
	"brand" text NOT NULL,
	"category" text DEFAULT 'grocery' NOT NULL,
	"base_gs" integer DEFAULT 0 NOT NULL,
	"carbon_pct" real DEFAULT 10,
	"verified" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "regulatory_updates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"jurisdiction" text DEFAULT '',
	"category" text DEFAULT '',
	"date" text DEFAULT '',
	"summary" text DEFAULT '',
	"impact" text DEFAULT 'medium',
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "retailer_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"retailer_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"retailer_gs" integer DEFAULT 0,
	"gs_match_type" text DEFAULT 'fixed',
	"gs_total" integer DEFAULT 0,
	"price_local" text DEFAULT '',
	"status" text DEFAULT 'active' NOT NULL,
	"valid_from" timestamp DEFAULT now(),
	"valid_to" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "retailers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" varchar(20) NOT NULL,
	"country" text DEFAULT 'UK' NOT NULL,
	"flag" text DEFAULT '🇬🇧',
	"status" text DEFAULT 'active' NOT NULL,
	"gs_match_policy" text DEFAULT 'none',
	"gs_match_value" real DEFAULT 0,
	"contact_email" text DEFAULT '',
	"notes" text DEFAULT '',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_status" (
	"id" serial PRIMARY KEY NOT NULL,
	"service" text NOT NULL,
	"status" text DEFAULT 'operational',
	"uptime" text DEFAULT '99.9%',
	"last_checked" timestamp DEFAULT now(),
	"notes" text DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE "value_protection" (
	"id" serial PRIMARY KEY NOT NULL,
	"dimension" text NOT NULL,
	"weight" integer DEFAULT 0,
	"description" text DEFAULT '',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "volume_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"threshold" text DEFAULT '',
	"price_per_gs" text DEFAULT '',
	"discount" text DEFAULT '',
	"description" text DEFAULT '',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "idx_changelog_created" ON "change_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_products_brand" ON "products" USING btree ("brand");--> statement-breakpoint
CREATE INDEX "idx_products_category" ON "products" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_rp_unique" ON "retailer_products" USING btree ("retailer_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_rp_retailer" ON "retailer_products" USING btree ("retailer_id");--> statement-breakpoint
CREATE INDEX "idx_rp_product" ON "retailer_products" USING btree ("product_id");