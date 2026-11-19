CREATE TYPE "public"."gender" AS ENUM('L', 'P');--> statement-breakpoint
CREATE TYPE "public"."fiscal_year_status" AS ENUM('terbuka', 'final', 'revisi');--> statement-breakpoint
CREATE TABLE "persons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nik_enc" "bytea",
	"nik_hash" "bytea",
	"nik_last4" char(4),
	"no_nik_reason" text,
	"full_name" text NOT NULL,
	"gender" "gender" NOT NULL,
	"birth_place" text,
	"birth_date" date,
	"merged_into_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "persons_nik_or_reason" CHECK (("persons"."nik_hash" IS NULL) <> ("persons"."no_nik_reason" IS NULL)),
	CONSTRAINT "persons_nik_parts" CHECK (("persons"."nik_hash" IS NULL) = ("persons"."nik_enc" IS NULL) AND ("persons"."nik_hash" IS NULL) = ("persons"."nik_last4" IS NULL)),
	CONSTRAINT "persons_birth_not_future" CHECK ("persons"."birth_date" IS NULL OR "persons"."birth_date" <= CURRENT_DATE)
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kk_enc" "bytea" NOT NULL,
	"kk_hash" "bytea" NOT NULL,
	"kk_last4" char(4) NOT NULL,
	"head_person_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "families_kk_hash_unique" UNIQUE("kk_hash")
);
--> statement-breakpoint
CREATE TABLE "fiscal_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"year" smallint NOT NULL,
	"status" "fiscal_year_status" DEFAULT 'terbuka' NOT NULL,
	"revision_no" smallint DEFAULT 0 NOT NULL,
	"age_reference_date" date NOT NULL,
	"age_bands" jsonb NOT NULL,
	"copied_from_id" uuid,
	"finalized_at" timestamp with time zone,
	"finalized_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fiscal_years_year_unique" UNIQUE("year"),
	CONSTRAINT "fiscal_years_year_range" CHECK ("fiscal_years"."year" BETWEEN 2000 AND 2100),
	CONSTRAINT "fiscal_years_revision_nonneg" CHECK ("fiscal_years"."revision_no" >= 0)
);
--> statement-breakpoint
CREATE TABLE "hazard_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"bit" smallint NOT NULL,
	"form_order" smallint NOT NULL,
	"regulation_ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hazard_types_code_unique" UNIQUE("code"),
	CONSTRAINT "hazard_types_bit_unique" UNIQUE("bit"),
	CONSTRAINT "hazard_types_bit_range" CHECK ("hazard_types"."bit" BETWEEN 0 AND 9)
);
--> statement-breakpoint
CREATE TABLE "form_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_code" text NOT NULL,
	"version" smallint NOT NULL,
	"regulation_ref" text NOT NULL,
	"title" text NOT NULL,
	"layout" jsonb NOT NULL,
	"effective_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_definitions_code_version" UNIQUE("form_code","version")
);
--> statement-breakpoint
ALTER TABLE "persons" ADD CONSTRAINT "persons_merged_into_id_persons_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "families_head_person_id_persons_id_fk" FOREIGN KEY ("head_person_id") REFERENCES "public"."persons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_copied_from_id_fiscal_years_id_fk" FOREIGN KEY ("copied_from_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "persons_nik_hash_unique" ON "persons" USING btree ("nik_hash") WHERE "persons"."nik_hash" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "persons_full_name_trgm" ON "persons" USING gin ("full_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "persons_name_birth_idx" ON "persons" USING btree ("full_name","birth_date");--> statement-breakpoint
-- Penguncian tahun anggaran (Prinsip VII). Melempar ET423 bila tahun berstatus final.
CREATE OR REPLACE FUNCTION spm_assert_year_writable(p_fiscal_year_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  v_status fiscal_year_status;
  v_year smallint;
BEGIN
  SELECT status, year INTO v_status, v_year FROM fiscal_years WHERE id = p_fiscal_year_id;
  IF v_status = 'final' THEN
    RAISE EXCEPTION 'Tahun anggaran % sudah final dan terkunci', v_year USING ERRCODE = 'ET423';
  END IF;
END;
$$;
--> statement-breakpoint
-- Fungsi pemicu umum untuk setiap tabel ber-fiscal_year_id; dipasang di migrasi story terkait:
-- CREATE TRIGGER <tabel>_year_lock BEFORE INSERT OR UPDATE OR DELETE ON <tabel>
--   FOR EACH ROW EXECUTE FUNCTION spm_year_lock_trigger();
CREATE OR REPLACE FUNCTION spm_year_lock_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM spm_assert_year_writable(OLD.fiscal_year_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM spm_assert_year_writable(NEW.fiscal_year_id);
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;
