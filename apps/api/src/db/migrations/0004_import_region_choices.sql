ALTER TABLE "import_batches" ADD COLUMN "region_choices" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "warnings" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "original_name" text;