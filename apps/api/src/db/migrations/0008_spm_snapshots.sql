CREATE TABLE "fiscal_year_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"revision_no" smallint NOT NULL,
	"reason" text,
	"recap_json" jsonb NOT NULL,
	"archive_file_id" uuid NOT NULL,
	"sha256" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_year_snapshots_rev" UNIQUE("fiscal_year_id","revision_no")
);
--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD COLUMN "revision_reason" text;--> statement-breakpoint
ALTER TABLE "fiscal_year_snapshots" ADD CONSTRAINT "fiscal_year_snapshots_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_year_snapshots" ADD CONSTRAINT "fiscal_year_snapshots_archive_file_id_files_id_fk" FOREIGN KEY ("archive_file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_year_snapshots" ADD CONSTRAINT "fiscal_year_snapshots_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fiscal_year_snapshots_fy_idx" ON "fiscal_year_snapshots" USING btree ("fiscal_year_id");--> statement-breakpoint
-- Arsip finalisasi tidak boleh diubah atau dihapus (Prinsip VII).
CREATE OR REPLACE FUNCTION snapshot_reject_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'fiscal_year_snapshots hanya boleh ditambah' USING ERRCODE = 'ET403';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER fiscal_year_snapshots_append_only BEFORE UPDATE OR DELETE ON fiscal_year_snapshots
  FOR EACH ROW EXECUTE FUNCTION snapshot_reject_change();
--> statement-breakpoint
-- Berkas arsip yang dirujuk cuplikan tidak boleh dihapus.
CREATE OR REPLACE FUNCTION archive_file_protect() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.kind = 'arsip' THEN
    RAISE EXCEPTION 'berkas arsip tidak boleh dihapus' USING ERRCODE = 'ET403';
  END IF;
  RETURN OLD;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER files_archive_protect BEFORE DELETE ON files
  FOR EACH ROW EXECUTE FUNCTION archive_file_protect();
