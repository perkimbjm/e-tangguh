ALTER TABLE "officer_records" ADD COLUMN "photo_file_id" uuid;--> statement-breakpoint
ALTER TABLE "officer_records" ADD COLUMN "card_code" text;--> statement-breakpoint
ALTER TABLE "officer_records" ADD COLUMN "card_issued_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "officer_records" ADD CONSTRAINT "officer_records_photo_file_id_files_id_fk" FOREIGN KEY ("photo_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_records" ADD CONSTRAINT "officer_records_card_code_unique" UNIQUE("card_code");