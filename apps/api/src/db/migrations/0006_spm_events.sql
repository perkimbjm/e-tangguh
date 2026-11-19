CREATE TYPE "public"."affected_status" AS ENUM('meninggal', 'hilang', 'medis_darurat', 'medis_lanjut', 'selamat');--> statement-breakpoint
CREATE TABLE "disaster_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"hazard_type_id" uuid NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"reported_at" timestamp with time zone NOT NULL,
	"location_text" text NOT NULL,
	"kelurahan_id" uuid,
	"location" geography(Point,4326),
	"emergency_declared_at" timestamp with time zone,
	"emergency_doc_file_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disaster_events_report_after" CHECK ("disaster_events"."reported_at" >= "disaster_events"."occurred_at")
);
--> statement-breakpoint
CREATE TABLE "affected_persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"person_id" uuid NOT NULL,
	"status" "affected_status" NOT NULL,
	"is_displaced" boolean DEFAULT false NOT NULL,
	"status_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affected_persons_event_person" UNIQUE("event_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "affected_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affected_person_id" uuid NOT NULL,
	"status" "affected_status" NOT NULL,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"changed_by" uuid,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "event_officers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"officer_record_id" uuid NOT NULL,
	"is_trc_klb" boolean DEFAULT false NOT NULL,
	"is_trc_pdb" boolean DEFAULT false NOT NULL,
	"is_ppe" boolean DEFAULT false NOT NULL,
	"is_ops" boolean DEFAULT true NOT NULL,
	"post_type" "post_type",
	"post_kecamatan_id" uuid,
	"post_kelurahan_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_officers_event_officer" UNIQUE("event_id","officer_record_id")
);
--> statement-breakpoint
ALTER TABLE "disaster_events" ADD CONSTRAINT "disaster_events_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disaster_events" ADD CONSTRAINT "disaster_events_hazard_type_id_hazard_types_id_fk" FOREIGN KEY ("hazard_type_id") REFERENCES "public"."hazard_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disaster_events" ADD CONSTRAINT "disaster_events_kelurahan_id_regions_id_fk" FOREIGN KEY ("kelurahan_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disaster_events" ADD CONSTRAINT "disaster_events_emergency_doc_file_id_files_id_fk" FOREIGN KEY ("emergency_doc_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affected_persons" ADD CONSTRAINT "affected_persons_event_id_disaster_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."disaster_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affected_persons" ADD CONSTRAINT "affected_persons_person_id_persons_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affected_status_history" ADD CONSTRAINT "affected_status_history_affected_person_id_affected_persons_id_fk" FOREIGN KEY ("affected_person_id") REFERENCES "public"."affected_persons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affected_status_history" ADD CONSTRAINT "affected_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_officers" ADD CONSTRAINT "event_officers_event_id_disaster_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."disaster_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_officers" ADD CONSTRAINT "event_officers_officer_record_id_officer_records_id_fk" FOREIGN KEY ("officer_record_id") REFERENCES "public"."officer_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_officers" ADD CONSTRAINT "event_officers_post_kecamatan_id_regions_id_fk" FOREIGN KEY ("post_kecamatan_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_officers" ADD CONSTRAINT "event_officers_post_kelurahan_id_regions_id_fk" FOREIGN KEY ("post_kelurahan_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "disaster_events_year_idx" ON "disaster_events" USING btree ("fiscal_year_id","occurred_at");--> statement-breakpoint
CREATE INDEX "disaster_events_location_gist" ON "disaster_events" USING gist ("location");--> statement-breakpoint
CREATE INDEX "affected_status_history_idx" ON "affected_status_history" USING btree ("affected_person_id","changed_at");--> statement-breakpoint
CREATE TRIGGER disaster_events_year_lock BEFORE INSERT OR UPDATE OR DELETE ON disaster_events
  FOR EACH ROW EXECUTE FUNCTION spm_year_lock_trigger();
--> statement-breakpoint
-- Tabel turunan kejadian dikunci menurut tahun anggaran kejadiannya.
CREATE OR REPLACE FUNCTION spm_event_year_lock_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_event uuid;
  v_fy uuid;
BEGIN
  IF TG_TABLE_NAME = 'affected_status_history' THEN
    SELECT event_id INTO v_event FROM affected_persons
      WHERE id = (CASE WHEN TG_OP = 'DELETE' THEN OLD.affected_person_id ELSE NEW.affected_person_id END);
  ELSE
    v_event := CASE WHEN TG_OP = 'DELETE' THEN OLD.event_id ELSE NEW.event_id END;
  END IF;
  SELECT fiscal_year_id INTO v_fy FROM disaster_events WHERE id = v_event;
  IF v_fy IS NOT NULL THEN
    PERFORM spm_assert_year_writable(v_fy);
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER affected_persons_year_lock BEFORE INSERT OR UPDATE OR DELETE ON affected_persons
  FOR EACH ROW EXECUTE FUNCTION spm_event_year_lock_trigger();
--> statement-breakpoint
CREATE TRIGGER event_officers_year_lock BEFORE INSERT OR UPDATE OR DELETE ON event_officers
  FOR EACH ROW EXECUTE FUNCTION spm_event_year_lock_trigger();
--> statement-breakpoint
CREATE TRIGGER affected_status_history_year_lock BEFORE INSERT ON affected_status_history
  FOR EACH ROW EXECUTE FUNCTION spm_event_year_lock_trigger();
--> statement-breakpoint
-- Riwayat status korban hanya-tambah.
CREATE OR REPLACE FUNCTION affected_history_reject_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'affected_status_history hanya boleh ditambah' USING ERRCODE = 'ET403';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER affected_status_history_append_only BEFORE UPDATE ON affected_status_history
  FOR EACH ROW EXECUTE FUNCTION affected_history_reject_change();
