import { variationLabel } from '../hazards';
import { kelurahanRowFilter, kelurahanRowParts, kelurahanRows } from './rows';
import type { CellDefinition, RecapColumn, RecapContext, RecapRowDef } from './types';

/** Form 5.A.3: baris kelurahan; kolom per variasi kerawanan yang ada di kota (dinamis) + total. */
export const RECAP_5A3 = {
  formCode: '5.A.3' as const,

  variations(ctx: RecapContext) {
    return [...new Set(ctx.masks)].filter((m) => m > 0).sort((a, b) => a - b).map((mask, i) => ({ number: i + 1, mask, label: variationLabel(mask) }));
  },

  columns(ctx: RecapContext): RecapColumn[] {
    const vars = this.variations(ctx);
    const cols: RecapColumn[] = [];
    vars.forEach((v, i) => {
      const base = 4 + i * 3;
      const group = `VARIASI ${v.number}`;
      cols.push({ key: `v:${v.mask}:jenis`, number: base, label: 'KELOMPOK JENIS', group, text: true });
      cols.push({ key: `v:${v.mask}:kk`, number: base + 1, label: 'KK', group });
      cols.push({ key: `v:${v.mask}:jiwa`, number: base + 2, label: 'JIWA', group });
    });
    const n = 4 + vars.length * 3;
    cols.push({ key: 'total:kk', number: n, label: 'KK', group: 'TOTAL' });
    cols.push({ key: 'total:jiwa', number: n + 1, label: 'JIWA', group: 'TOTAL' });
    return cols;
  },

  rows(ctx: RecapContext): RecapRowDef[] {
    return kelurahanRows(ctx);
  },

  cell(rowKey: string, colKey: string, ctx: RecapContext): CellDefinition | null {
    const base = { formCode: this.formCode, rowKey, colKey };
    if (colKey.endsWith(':jenis')) return null;
    const rowFilter = kelurahanRowFilter(rowKey);
    if (!rowFilter) {
      return { ...base, kind: 'sum', parts: kelurahanRowParts(rowKey, ctx).map((r) => ({ rowKey: r, colKey })) };
    }
    if (colKey === 'total:kk' || colKey === 'total:jiwa') {
      const suffix = colKey.slice(6);
      return { ...base, kind: 'sum', parts: this.variations(ctx).map((v) => ({ rowKey, colKey: `v:${v.mask}:${suffix}` })) };
    }
    const m = /^v:(\d+):(kk|jiwa)$/.exec(colKey);
    if (!m) return null;
    return {
      ...base,
      kind: 'measure',
      measure: m[2] === 'kk' ? 'families' : 'persons',
      filter: { ...rowFilter, hazardMask: Number(m[1]) },
    };
  },
};
