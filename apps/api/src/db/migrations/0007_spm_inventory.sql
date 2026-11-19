CREATE TABLE "equipment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit" text NOT NULL,
	"location_text" text,
	"institution" text,
	"qty_good" numeric(14, 2) DEFAULT '0' NOT NULL,
	"qty_broken" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"support_kaji_cepat" boolean DEFAULT false NOT NULL,
	"support_pencarian" boolean DEFAULT false NOT NULL,
	"support_korban_meninggal" boolean DEFAULT false NOT NULL,
	"support_medis" boolean DEFAULT false NOT NULL,
	"support_pengungsian" boolean DEFAULT false NOT NULL,
	CONSTRAINT "equipment_qty_condition" CHECK ("equipment"."qty_good" >= 0 AND "equipment"."qty_broken" >= 0 AND "equipment"."qty_good" + "equipment"."qty_broken" <= "equipment"."quantity")
);
--> statement-breakpoint
CREATE TABLE "logistics_stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fiscal_year_id" uuid NOT NULL,
	"name" text NOT NULL,
	"quantity" numeric(14, 2) NOT NULL,
	"unit" text NOT NULL,
	"location_text" text,
	"institution" text,
	"qty_good" numeric(14, 2) DEFAULT '0' NOT NULL,
	"qty_broken" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "logistics_stock_qty_condition" CHECK ("logistics_stock"."qty_good" >= 0 AND "logistics_stock"."qty_broken" >= 0 AND "logistics_stock"."qty_good" + "logistics_stock"."qty_broken" <= "logistics_stock"."quantity")
);
--> statement-breakpoint
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "logistics_stock" ADD CONSTRAINT "logistics_stock_fiscal_year_id_fiscal_years_id_fk" FOREIGN KEY ("fiscal_year_id") REFERENCES "public"."fiscal_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "equipment_year_idx" ON "equipment" USING btree ("fiscal_year_id");--> statement-breakpoint
CREATE INDEX "logistics_stock_year_idx" ON "logistics_stock" USING btree ("fiscal_year_id");--> statement-breakpoint
CREATE TRIGGER equipment_year_lock BEFORE INSERT OR UPDATE OR DELETE ON equipment
  FOR EACH ROW EXECUTE FUNCTION spm_year_lock_trigger();
--> statement-breakpoint
CREATE TRIGGER logistics_stock_year_lock BEFORE INSERT OR UPDATE OR DELETE ON logistics_stock
  FOR EACH ROW EXECUTE FUNCTION spm_year_lock_trigger();
