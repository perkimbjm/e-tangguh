/**
 * Definisi sel rekap (R5): satu definisi dipakai untuk menghitung angka dan menelusuri baris
 * penyusunnya. Filter berbentuk data agar dapat dikompilasi ke SQL secara seragam.
 */
export interface ResidentFilter {
  kelurahanId?: string;
  kecamatanId?: string;
  /** Bitmask variasi kerawanan persis. */
  hazardMask?: number;
  /** Indeks bit jenis bencana (0-9) yang harus ada pada bitmask. */
  hazardBit?: number;
  isPoor?: boolean;
  hasSpecialNeeds?: boolean;
  /** Kelompok umur rentan = selain dewasa. */
  vulnerableAge?: boolean;
  isFamilyHead?: boolean;
}

/** `persons` = jumlah warga; `families` = KK berbeda; `zoneKelurahan` = kelurahan berbeda pada kawasan rawan; `officers` = petugas (US3). */
export type Measure = 'persons' | 'families' | 'zoneKelurahan' | 'officers';

export interface MeasureCell {
  kind: 'measure';
  measure: Measure;
  filter: ResidentFilter;
  /** Ukuran yang sumber datanya belum tersedia (mis. petugas sebelum US3); nilainya 0. */
  pending?: string;
}

export interface SumCell {
  kind: 'sum';
  /** Pasangan baris/kolom komponen. */
  parts: { rowKey: string; colKey: string }[];
}

export type CellDefinition = (MeasureCell | SumCell) & { formCode: RecapFormCode; rowKey: string; colKey: string };

export type RecapFormCode = '5.A.3' | '5.A.4' | '5.A.6';
export const RECAP_FORM_CODES: readonly RecapFormCode[] = ['5.A.3', '5.A.4', '5.A.6'];

export interface RecapColumn {
  key: string;
  /** Nomor kolom formulir. */
  number: number;
  label: string;
  group?: string;
  /** Kolom teks (mis. kelompok jenis, keterangan), bukan angka. */
  text?: boolean;
}

export interface RecapRowDef {
  key: string;
  label: string;
  /** Label pengelompokan (mis. kecamatan). */
  group?: string;
  kind: 'data' | 'subtotal' | 'total';
}

export interface RecapCellValue {
  cellKey: string;
  value: number;
  pending?: string;
}

export interface RecapTable {
  formCode: RecapFormCode;
  year: number;
  columns: RecapColumn[];
  rows: (RecapRowDef & { cells: Record<string, RecapCellValue | { text: string }> })[];
  /** Untuk 5.A.3: daftar bitmask variasi berurutan. */
  variations?: { number: number; mask: number; label: string }[];
  notes: string[];
}

export interface DrillRow {
  key: string;
  label: string;
  detail: string;
  component?: string;
}

export interface DrillResult {
  cellKey: string;
  value: number;
  measure: Measure | 'sum';
  rows: DrillRow[];
  truncated: boolean;
}

/** Konteks dimensi untuk membangun sel: kelurahan (berurut kecamatan) dan variasi kerawanan. */
export interface RecapContext {
  kelurahan: { id: string; name: string; kecamatanId: string | null; kecamatanName: string | null }[];
  masks: number[];
}
