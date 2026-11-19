import type { CellDefinition, MeasureCell, RecapContext, RecapSpec } from '@etangguh/shared';

import type { DbService } from '../../../db/db.module';
import { hazardZones, officerRecords, residentRecords } from '../../../db/schema';
import { compileOfficerFilter, compileResidentFilter, compileZoneFilter, filterSignature, measureExpr, officerBase, residentBase, zoneBase } from './recap-query.builder';

type Measured = CellDefinition & MeasureCell;

/**
 * Menghitung nilai sel ukuran secara massal. Sel berfilter kelurahan dikelompokkan per kelurahan
 * (satu ekspresi per kolom); sel tanpa kelurahan dihitung tanpa pengelompokan.
 */
export async function evaluateMeasures(db: DbService, cells: Measured[], fiscalYearId: string, scope: string | null): Promise<Map<string, number>> {
  const values = new Map<string, number>();
  const key = (c: { rowKey: string; colKey: string }) => `${c.rowKey}|${c.colKey}`;

  const sources = {
    residents: { table: residentRecords, base: residentBase(fiscalYearId, scope), compile: compileResidentFilter, kelCol: residentRecords.kelurahanId },
    zones: { table: hazardZones, base: zoneBase(fiscalYearId, scope), compile: compileZoneFilter, kelCol: hazardZones.kelurahanId },
    officers: { table: officerRecords, base: officerBase(fiscalYearId, scope), compile: compileOfficerFilter, kelCol: officerRecords.dutyKelurahanId },
  } as const;
  const sourceOf = (c: Measured) => (c.measure === 'zoneKelurahan' ? 'zones' : c.measure === 'officers' ? 'officers' : 'residents');

  for (const source of ['residents', 'zones', 'officers'] as const) {
    const relevant = cells.filter((c) => sourceOf(c) === source);
    if (!relevant.length) continue;
    const { table, base, compile, kelCol } = sources[source];

    // Dikelompokkan per kelurahan.
    const grouped = relevant.filter((c) => c.filter.kelurahanId !== undefined);
    if (grouped.length) {
      const sigs = new Map<string, Measured>();
      for (const c of grouped) sigs.set(filterSignature(c.measure, c.filter), c);
      const exprs = [...sigs.entries()];
      const select: Record<string, ReturnType<typeof measureExpr> | typeof kelCol> = { kel: kelCol };
      exprs.forEach(([, c], i) => {
        const { kelurahanId: _k, ...rest } = c.filter;
        select[`m${i}`] = measureExpr(c.measure, compile(rest));
      });
      const rows = (await db.executor().select(select).from(table).where(base).groupBy(kelCol)) as Record<string, unknown>[];
      const byKel = new Map(rows.map((r) => [r.kel as string, r]));
      for (const c of grouped) {
        const i = exprs.findIndex(([s]) => s === filterSignature(c.measure, c.filter));
        values.set(key(c), Number(byKel.get(c.filter.kelurahanId!)?.[`m${i}`] ?? 0));
      }
    }

    // Tanpa pengelompokan.
    const flat = relevant.filter((c) => c.filter.kelurahanId === undefined);
    if (flat.length) {
      const select: Record<string, ReturnType<typeof measureExpr>> = {};
      flat.forEach((c, i) => (select[`m${i}`] = measureExpr(c.measure, compile(c.filter))));
      const [row] = (await db.executor().select(select).from(table).where(base)) as Record<string, unknown>[];
      flat.forEach((c, i) => values.set(key(c), Number(row?.[`m${i}`] ?? 0)));
    }
  }
  return values;
}

/** Nilai sel apa pun (ukuran atau penjumlahan), dengan memoisasi. */
export function resolveCell(
  spec: RecapSpec,
  ctx: RecapContext,
  rowKey: string,
  colKey: string,
  measured: Map<string, number>,
  memo = new Map<string, number>(),
): number {
  const k = `${rowKey}|${colKey}`;
  if (memo.has(k)) return memo.get(k)!;
  const def = spec.cell(rowKey, colKey, ctx);
  let v = 0;
  if (def?.kind === 'measure') v = measured.get(k) ?? 0;
  else if (def?.kind === 'sum') v = def.parts.reduce((a, p) => a + resolveCell(spec, ctx, p.rowKey, p.colKey, measured, memo), 0);
  memo.set(k, v);
  return v;
}

/** Semua sel ukuran yang dibutuhkan (termasuk komponen penjumlahan), tanpa duplikat. */
export function collectMeasureCells(spec: RecapSpec, ctx: RecapContext, pairs: { rowKey: string; colKey: string }[]): Measured[] {
  const out = new Map<string, Measured>();
  const seen = new Set<string>();
  const visit = (rowKey: string, colKey: string) => {
    const k = `${rowKey}|${colKey}`;
    if (seen.has(k)) return;
    seen.add(k);
    const def = spec.cell(rowKey, colKey, ctx);
    if (def?.kind === 'measure') out.set(k, def);
    else if (def?.kind === 'sum') def.parts.forEach((p) => visit(p.rowKey, p.colKey));
  };
  pairs.forEach((p) => visit(p.rowKey, p.colKey));
  return [...out.values()];
}

