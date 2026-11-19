import { HAZARDS } from '../hazards';
import type { CellDefinition, MeasureCell, RecapColumn, RecapRowDef } from './types';

const PENDING = 'Menunggu data petugas (US3)';

const COLUMNS: (RecapColumn & { cell?: Omit<MeasureCell, 'kind' | 'filter'> })[] = [
  { key: 'c3', number: 3, label: 'JIWA', group: 'PENDUDUK', cell: { measure: 'persons' } },
  { key: 'c4', number: 4, label: 'KK', group: 'PENDUDUK', cell: { measure: 'families' } },
  { key: 'c5', number: 5, label: 'DESA', group: 'PENDUDUK', cell: { measure: 'zoneKelurahan' } },
  { key: 'c6', number: 6, label: 'TRC PDB', group: 'PETUGAS', cell: { measure: 'officers', pending: PENDING } },
  { key: 'c7', number: 7, label: 'TRC KLB', group: 'PETUGAS', cell: { measure: 'officers', pending: PENDING } },
  { key: 'c8', number: 8, label: 'PPE', group: 'PETUGAS', cell: { measure: 'officers', pending: PENDING } },
  { key: 'c9', number: 9, label: 'OPERASI', group: 'PETUGAS', cell: { measure: 'officers', pending: PENDING } },
  { key: 'c10', number: 10, label: 'JUMLAH PETUGAS', group: 'PETUGAS', cell: { measure: 'officers', pending: PENDING } },
  // Kolom 11 mengikuti rumus pada kepala kolom formulir: kolom 4 + kolom 10 (perlu dikonfirmasi BPBD).
  { key: 'c11', number: 11, label: 'TOTAL WAJIB LATIH' },
];

/** Form 5.A.6: baris = sepuluh jenis bencana. */
export const RECAP_5A6 = {
  formCode: '5.A.6' as const,

  columns(): RecapColumn[] {
    return COLUMNS.map(({ cell: _cell, ...c }) => c);
  },

  rows(): RecapRowDef[] {
    return HAZARDS.map((h) => ({ key: `hazard:${h.code}`, label: h.name, kind: 'data' as const }));
  },

  cell(rowKey: string, colKey: string): CellDefinition | null {
    const hazard = HAZARDS.find((h) => `hazard:${h.code}` === rowKey);
    const col = COLUMNS.find((c) => c.key === colKey);
    if (!hazard || !col) return null;
    const base = { formCode: this.formCode, rowKey, colKey };
    if (colKey === 'c11') return { ...base, kind: 'sum', parts: [{ rowKey, colKey: 'c4' }, { rowKey, colKey: 'c10' }] };
    return { ...base, kind: 'measure', ...col.cell!, filter: { hazardBit: hazard.bit } };
  },
};
