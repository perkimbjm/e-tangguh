import { sql } from 'drizzle-orm';
import { check, index, pgTable } from 'drizzle-orm/pg-core';
import { inventoryColumns } from './equipment';

/** Stok logistik pengungsian (Form 5.A.8). */
export const logisticsStock = pgTable('logistics_stock', inventoryColumns(), (t) => [
  index('logistics_stock_year_idx').on(t.fiscalYearId),
  check('logistics_stock_qty_condition', sql`${t.qtyGood} >= 0 AND ${t.qtyBroken} >= 0 AND ${t.qtyGood} + ${t.qtyBroken} <= ${t.quantity}`),
]);
