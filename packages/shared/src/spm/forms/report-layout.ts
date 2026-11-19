import type { FormDefinition } from './types';

/** Identitas wilayah pada kepala laporan. */
export const REPORT_REGION = { provinsi: 'KALIMANTAN SELATAN', kabupatenKota: 'KOTA BANJARMASIN' } as const;

/**
 * Tata letak ekspor (contracts/forms.md): judul formulir, PROVINSI, KABUPATEN/KOTA, TAHUN ANGGARAN,
 * lalu kepala tabel resmi apa adanya. Bila definisi sudah memuat baris judul (A1 "FORM …"), baris
 * itu menjadi baris 1; bila tidak, judul ditambahkan di baris 1.
 */
export function hasTitleRow(def: FormDefinition): boolean {
  return /^FORM\s/i.test(def.cells.A1 ?? '');
}

/** Nomor baris berkas untuk baris `r` pada definisi. */
export function reportRow(def: FormDefinition, r: number): number {
  if (hasTitleRow(def)) return r === 1 ? 1 : r + 3;
  return r + 4;
}

export function reportDataStartRow(def: FormDefinition): number {
  return reportRow(def, def.headerLastRow) + 1;
}

export function reportInfoLines(year: number): string[] {
  return [`PROVINSI : ${REPORT_REGION.provinsi}`, `KABUPATEN/KOTA : ${REPORT_REGION.kabupatenKota}`, `TAHUN ANGGARAN : ${year}`];
}

/** Nilai sel data ekspor. `true` dicetak sebagai tanda centang. */
export type ReportCell = string | number | boolean | null;

export interface ReportData {
  def: FormDefinition;
  year: number;
  rows: Record<string, ReportCell>[];
  /** Baris jumlah/subjumlah dicetak tebal. */
  boldRows?: Set<number>;
  notes?: string[];
}

export const CHECK_MARK = '✓';
