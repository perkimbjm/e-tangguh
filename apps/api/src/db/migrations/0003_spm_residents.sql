CREATE TYPE "public"."hazard_zone_basis" AS ENUM('krb', 'keputusan_bpbd');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('divalidasi', 'dikonfirmasi', 'dibatalkan');--> statement-breakpoint
CREATE TYPE "public"."import_outcome" AS ENUM('baru', 'berubah', 'sama', 'ditolak');--> statement-breakpoint
CREATE TYPE "public"."age_group" AS ENUM('balita', 'anak', 'dewasa', 'lansia');--> statement-breakpoint
CREATE TYPE "public"."approval_status" AS ENUM('menunggu', 'disetujui', 'dikembalikan');--> statement-breakpoint
CREATE TYPE "public"."inactive_reason" AS ENUM('meninggal', 'pindah', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."correction_status" AS ENUM('diajukan', 'diterima', 'ditolak');--> statement-breakpoint
CREATE TABLE "hazard_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"kelurahan_id" uuid NOT NULL,
	"rw" text NOT NULL,
	"rt" text,
	"hazard_mask" smallint NOT NULL,
	"basis" "hazard_zone_basis" NOT NULL,
	"basis_ref" text NOT NULL,
	"geom" geometry(MultiPolygon,4326),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hazard_zones_unique" UNIQUE NULLS NOT DISTINCT("fiscal_year_id","kelurahan_id","rw","rt"),
	CONSTRAINT "hazard_zones_mask" CHECK ("hazard_zones"."hazard_mask" BETWEEN 1 AND 1023)
);
--> statement-breakpoint
CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"form_code" text NOT NULL,
	"kelurahan_id" uuid,
	"file_id" uuid,
	"file_sha256" text NOT NULL,
	"status" "import_status" DEFAULT 'divalidasi' NOT NULL,
	"rows_total" integer DEFAULT 0 NOT NULL,
	"rows_new" integer DEFAULT 0 NOT NULL,
	"rows_changed" integer DEFAULT 0 NOT NULL,
	"rows_unchanged" integer DEFAULT 0 NOT NULL,
	"rows_rejected" integer DEFAULT 0 NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"confirmed_at" timestamp with time zone,
	"purged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_rows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"row_number" integer NOT NULL,
	"raw" jsonb NOT NULL,
	"normalized" jsonb,
	"errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcome" "import_outcome" NOT NULL,
	"target_id" uuid
);
--> statement-breakpoint
CREATE TABLE "resident_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"family_id" uuid,
	"is_family_head" boolean DEFAULT false NOT NULL,
	"kelurahan_id" uuid NOT NULL,
	"rw" text NOT NULL,
	"rt" text,
	"hazard_zone_id" uuid,
	"address_enc" "bytea" NOT NULL,
	"is_poor" boolean DEFAULT false NOT NULL,
	"has_special_needs" boolean DEFAULT false NOT NULL,
	"special_needs_enc" "bytea",
	"age_group" "age_group" NOT NULL,
	"age_group_override_reason" text,
	"hazard_mask" smallint NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"inactive_reason" "inactive_reason",
	"inactive_date" date,
	"approval_status" "approval_status" DEFAULT 'menunggu' NOT NULL,
	"approval_note" text,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"source" text NOT NULL,
	"source_date" date NOT NULL,
	"import_batch_id" uuid,
	"row_version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resident_records_year_person" UNIQUE("fiscal_year_id","person_id"),
	CONSTRAINT "resident_records_special_needs" CHECK (NOT "resident_records"."has_special_needs" OR "resident_records"."special_needs_enc" IS NOT NULL),
	CONSTRAINT "resident_records_inactive" CHECK ("resident_records"."is_active" OR "resident_records"."inactive_reason" IS NOT NULL),
	CONSTRAINT "resident_records_mask" CHECK ("resident_records"."hazard_mask" BETWEEN 1 AND 1023)
);
--> statement-breakpoint
CREATE TABLE "data_corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"person_id" uuid NOT NULL,
	"fiscal_year_id" uuid,
	"requested_via" text NOT NULL,
	"message" text NOT NULL,
	"status" "correction_status" DEFAULT 'diajukan' NOT NULL,
	"resolved_by" uuid,
	"resolution_note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hazard_zones" ADD CONSTRAINT "hazard_zones_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazard_zones" ADD CONSTRAINT "hazard_zones_kelurahan_id_regions_id_fk" FOREIGN KEY ("kelurahan_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_kelurahan_id_regions_id_fk" FOREIGN KEY ("kelurahan_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_rows" ADD CONSTRAINT "import_rows_batch_id_import_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."import_batches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_records" ADD CONSTRAINT "resident_records_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_records" ADD CONSTRAINT "resident_records_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_records" ADD CONSTRAINT "resident_records_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_records" ADD CONSTRAINT "resident_records_kelurahan_id_regions_id_fk" FOREIGN KEY ("kelurahan_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_records" ADD CONSTRAINT "resident_records_hazard_zone_id_hazard_zones_id_fk" FOREIGN KEY ("hazard_zone_id") REFERENCES "public"."hazard_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_records" ADD CONSTRAINT "resident_records_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resident_records" ADD CONSTRAINT "resident_records_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD CONSTRAINT "data_corrections_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD CONSTRAINT "data_corrections_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_corrections" ADD CONSTRAINT "data_corrections_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hazard_zones_geom_gist" ON "hazard_zones" USING gist ("geom");--> statement-breakpoint
CREATE INDEX "import_rows_batch_idx" ON "import_rows" USING btree ("batch_id","row_number");--> statement-breakpoint
CREATE INDEX "resident_records_scope_idx" ON "resident_records" USING btree ("fiscal_year_id","kelurahan_id","approval_status","is_active");--> statement-breakpoint
CREATE INDEX "resident_records_hazard_idx" ON "resident_records" USING btree ("fiscal_year_id","hazard_mask");--> statement-breakpoint
CREATE INDEX "resident_records_family_idx" ON "resident_records" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "resident_records_batch_idx" ON "resident_records" USING btree ("import_batch_id");--> statement-breakpoint
CREATE TRIGGER hazard_zones_year_lock BEFORE INSERT OR UPDATE OR DELETE ON hazard_zones
  FOR EACH ROW EXECUTE FUNCTION spm_year_lock_trigger();
--> statement-breakpoint
CREATE TRIGGER resident_records_year_lock BEFORE INSERT OR UPDATE OR DELETE ON resident_records
  FOR EACH ROW EXECUTE FUNCTION spm_year_lock_trigger();
--> statement-breakpoint
CREATE TRIGGER import_batches_year_lock BEFORE INSERT ON import_batches
  FOR EACH ROW EXECUTE FUNCTION spm_year_lock_trigger();
