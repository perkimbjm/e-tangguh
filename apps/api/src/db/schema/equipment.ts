import { sql } from 'drizzle-orm';
import { boolean, check, index, numeric, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { createdBy, id, timestamps } from './_columns';
import { fiscalYears } from './fiscal-years';

const qty = (name: string) => numeric(name, { precision: 14, scale: 2 });

/** Kolom bersama inventaris (jumlah dan kondisi). */
export const inventoryColumns = () => ({
  id: id(),
  fiscalYearId: uuid('fiscal_year_id').notNull().references(() => fiscalYears.id),
  name: text('name').notNull(),
  quantity: qty('quantity').notNull(),
  unit: text('unit').notNull(),
  locationText: text('location_text'),
  institution: text('institution'),
  qtyGood: qty('qty_good').notNull().default('0'),
  qtyBroken: qty('qty_broken').notNull().default('0'),
  createdBy: createdBy(),
  ...timestamps(),
});

/** Peralatan pendukung operasi tanggap darurat (Form 5.A.7). */
export const equipment = pgTable(
  'equipment',
  {
    ...inventoryColumns(),
    supportKajiCepat: boolean('support_kaji_cepat').notNull().default(false),
    supportPencarian: boolean('support_pencarian').notNull().default(false),
    supportKorbanMeninggal: boolean('support_korban_meninggal').notNull().default(false),
    supportMedis: boolean('support_medis').notNull().default(false),
    supportPengungsian: boolean('support_pengungsian').notNull().default(false),
  },
  (t) => [
    index('equipment_year_idx').on(t.fiscalYearId),
    check('equipment_qty_condition', sql`${t.qtyGood} >= 0 AND ${t.qtyBroken} >= 0 AND ${t.qtyGood} + ${t.qtyBroken} <= ${t.quantity}`),
  ],
);
