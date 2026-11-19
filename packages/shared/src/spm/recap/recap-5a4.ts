import { kelurahanRowFilter, kelurahanRowParts, kelurahanRows } from './rows';
import type { CellDefinition, MeasureCell, RecapColumn, RecapContext, RecapRowDef } from './types';

const PENDING_OFFICERS = 'Menunggu data petugas (US3)';

/** Kolom 4-13 Form 5.A.4 (contracts/forms.md). Kolom 4-8 dihitung dari petugas pada US3. */
const COLUMNS: (RecapColumn & { cell?: Omit<MeasureCell, 'kind'> })[] = [
  { key: 'c4', number: 4, label: 'PNS', group: 'APARATUR', cell: { measure: 'officers', filter: {}, pending: PENDING_OFFICERS } },
  { key: 'c5', number: 5, label: 'TNI', group: 'APARATUR', cell: { measure: 'officers', filter: {}, pending: PENDING_OFFICERS } },
  { key: 'c6', number: 6, label: 'POLRI', group: 'APARATUR', cell: { measure: 'officers', filter: {}, pending: PENDING_OFFICERS } },
  { key: 'c7', number: 7, label: 'SATLINMAS', group: 'APARATUR', cell: { measure: 'officers', filter: {}, pending: PENDING_OFFICERS } },
  { key: 'c8', number: 8, label: 'TENAGA KONTRAK', group: 'APARATUR', cell: { measure: 'officers', filter: {}, pending: PENDING_OFFICERS } },
  { key: 'c9', number: 9, label: 'JIWA', group: 'WARGA NEGARA', cell: { measure: 'persons', filter: {} } },
  { key: 'c10', number: 10, label: 'KK', group: 'WARGA NEGARA', cell: { measure: 'families', filter: {} } },
  { key: 'c11', number: 11, label: 'KK MISKIN', group: 'KERENTANAN', cell: { measure: 'families', filter: { isFamilyHead: true, isPoor: true } } },
  { key: 'c12', number: 12, label: 'BERKEBUTUHAN KHUSUS', group: 'KERENTANAN', cell: { measure: 'persons', filter: { hasSpecialNeeds: true } } },
  { key: 'c13', number: 13, label: 'KELOMPOK RENTAN', group: 'KERENTANAN', cell: { measure: 'persons', filter: { vulnerableAge: true } } },
  { key: 'c14', number: 14, label: 'KETERANGAN', text: true },
];

export const RECAP_5A4 = {
  formCode: '5.A.4' as const,

  columns(): RecapColumn[] {
    return COLUMNS.map(({ cell: _cell, ...c }) => c);
  },

  rows(ctx: RecapContext): RecapRowDef[] {
    return kelurahanRows(ctx);
  },

  cell(rowKey: string, colKey: string, ctx: RecapContext): CellDefinition | null {
    const col = COLUMNS.find((c) => c.key === colKey);
    if (!col?.cell) return null;
    const base = { formCode: this.formCode, rowKey, colKey };
    const rowFilter = kelurahanRowFilter(rowKey);
    if (!rowFilter) return { ...base, kind: 'sum', parts: kelurahanRowParts(rowKey, ctx).map((r) => ({ rowKey: r, colKey })) };
    return { ...base, kind: 'measure', ...col.cell, filter: { ...rowFilter, ...col.cell.filter } };
  },
};
