CREATE TYPE "public"."employment_status" AS ENUM('pns', 'tni', 'polri', 'satlinmas', 'kontrak', 'non_aparatur');--> statement-breakpoint
CREATE TYPE "public"."officer_position" AS ENUM('kasi_trantibumlinmas', 'babinsa', 'bhabinkamtibmas', 'linmas', 'relawan', 'lainnya');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('posko', 'pos_lapangan');--> statement-breakpoint
CREATE TABLE "officer_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"volunteer_id" uuid,
	"position" "officer_position" NOT NULL,
	"employment_status" "employment_status" NOT NULL,
	"duty_kelurahan_id" uuid,
	"certifications" text,
	"is_trc_klb" boolean DEFAULT false NOT NULL,
	"is_trc_pdb" boolean DEFAULT false NOT NULL,
	"is_ppe" boolean DEFAULT false NOT NULL,
	"is_ops" boolean DEFAULT true NOT NULL,
	"post_type" "post_type",
	"post_kelurahan_id" uuid,
	"hazard_mask" smallint DEFAULT 0 NOT NULL,
	"note" text,
	"import_batch_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "officer_records_year_person" UNIQUE("fiscal_year_id","person_id"),
	CONSTRAINT "officer_records_duty_required" CHECK ("officer_records"."position" = 'lainnya' OR "officer_records"."duty_kelurahan_id" IS NOT NULL),
	CONSTRAINT "officer_records_status_matches_position" CHECK (("officer_records"."position" <> 'kasi_trantibumlinmas' OR "officer_records"."employment_status" = 'pns')
        AND ("officer_records"."position" <> 'babinsa' OR "officer_records"."employment_status" = 'tni')
        AND ("officer_records"."position" <> 'bhabinkamtibmas' OR "officer_records"."employment_status" = 'polri')
        AND ("officer_records"."position" <> 'linmas' OR "officer_records"."employment_status" = 'satlinmas')
        AND ("officer_records"."position" <> 'relawan' OR "officer_records"."employment_status" = 'non_aparatur')),
	CONSTRAINT "officer_records_mask" CHECK ("officer_records"."hazard_mask" BETWEEN 0 AND 1023)
);
--> statement-breakpoint
ALTER TABLE "officer_records" ADD CONSTRAINT "officer_records_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_records" ADD CONSTRAINT "officer_records_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_records" ADD CONSTRAINT "officer_records_duty_kelurahan_id_regions_id_fk" FOREIGN KEY ("duty_kelurahan_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "officer_records" ADD CONSTRAINT "officer_records_post_kelurahan_id_regions_id_fk" FOREIGN KEY ("post_kelurahan_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "officer_records_duty_idx" ON "officer_records" USING btree ("fiscal_year_id","duty_kelurahan_id");--> statement-breakpoint
CREATE TRIGGER officer_records_year_lock BEFORE INSERT OR UPDATE OR DELETE ON officer_records
  FOR EACH ROW EXECUTE FUNCTION spm_year_lock_trigger();
