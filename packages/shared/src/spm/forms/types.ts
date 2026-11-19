export type FormCode = '5.A.1' | '5.A.2' | '5.A.3' | '5.A.4' | '5.A.5' | '5.A.6' | '5.A.7' | '5.A.8' | '5.A.9' | '5.A.10' | '5.A.11' | '5.A.12';

export type ColumnKind = 'no' | 'text' | 'id16' | 'date' | 'choice' | 'check' | 'number';

/** Satu kolom lembar kerja. `number` = nomor pada baris penomoran kolom (null bila tidak bernomor). */
export interface FormColumn {
  letter: string;
  number: number | null;
  key: string;
  label: string;
  kind: ColumnKind;
  /** Dihitung sistem; diabaikan saat impor. */
  derived?: boolean;
  width?: number;
}

/** Kolom bantu di luar formulir resmi; dikenali dari teks kepalanya saat impor. */
export interface HelperColumn {
  key: string;
  label: string;
  aliases: string[];
}

/**
 * Definisi formulir resmi berversi (Prinsip VII). `cells` dan `merged` adalah kepala resmi apa
 * adanya (diekstrak dari templat kosong BPBD); `columns` memetakan kolom ke bidang data.
 */
export interface FormDefinition {
  formCode: FormCode;
  version: number;
  regulationRef: string;
  title: string;
  sheetName: string;
  /** Baris terakhir kepala (= baris penomoran kolom). Data mulai baris berikutnya. */
  headerLastRow: number;
  cells: Record<string, string>;
  merged: string[];
  columns: FormColumn[];
  helperColumns?: HelperColumn[];
}

export const REGULATION_REF = 'Permendagri No. 101 Tahun 2018; templat SPM BPBD Kota Banjarmasin TA 2026';

export function columnIndex(letter: string): number {
  let n = 0;
  for (const ch of letter.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export function columnLetter(index: number): string {
  let s = '';
  let n = index;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function lastColumnIndex(def: FormDefinition): number {
  return Math.max(...def.columns.map((c) => columnIndex(c.letter)));
}
