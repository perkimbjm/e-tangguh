import { FORM_5A1, type FormDefinition, columnLetter, lastColumnIndex } from '@etangguh/shared';
import ExcelJS from 'exceljs';

/**
 * Pembangkit lembar kerja Form 5.A.1 SINTETIS. NIK/KK berawalan "99" (bukan kode provinsi) agar
 * tidak pernah sama dengan NIK nyata. Data warga nyata DILARANG dipakai untuk uji.
 */
export interface ResidentSheetOptions {
  rows: number;
  /** Jumlah baris salah (galat beragam), ditempatkan merata. */
  errors?: number;
  kelurahan: string;
  kecamatan: string;
  /** RW (dan RT opsional) yang termasuk kawasan rawan. */
  zones: { rw: string; rt?: string | null }[];
  seed?: number;
  /** Awal nomor urut NIK; ubah agar dua berkas tidak bertumpuk. */
  nikStart?: number;
  /** Tulis RT/RW pada kolom bantu (true) atau di dalam alamat (false). */
  helperColumns?: boolean;
  title?: boolean;
  year?: number;
}

const FIRST = ['Ahmad', 'Siti', 'Budi', 'Nur', 'Rahmat', 'Dewi', 'Fajar', 'Lestari', 'Hendra', 'Aisyah', 'Rizky', 'Wulan'];
const LAST = ['Hidayat', 'Rahman', 'Saputra', 'Wati', 'Pratama', 'Santoso', 'Maulida', 'Kusuma', 'Ramadhan', 'Fitriani'];
const ERROR_KINDS = ['nik_pendek', 'nama_kosong', 'jk_salah', 'tanggal_salah', 'luar_kawasan', 'kk_pendek', 'ekonomi_salah', 'kebutuhan_kosong'] as const;
export type ErrorKind = (typeof ERROR_KINDS)[number];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const syntheticNik = (n: number) => `99${String(n).padStart(14, '0')}`;
export const syntheticKk = (n: number) => `98${String(n).padStart(14, '0')}`;

export interface GeneratedRow {
  rowNumber: number;
  nik: string | null;
  error: ErrorKind | null;
}

function drawHeader(ws: ExcelJS.Worksheet, def: FormDefinition, offset: number): void {
  for (const [ref, value] of Object.entries(def.cells)) {
    ws.getCell(ref.replace(/(\d+)/, (n) => String(Number(n) + offset))).value = value;
  }
  for (const range of def.merged) ws.mergeCells(range.replace(/(\d+)/g, (n) => String(Number(n) + offset)));
}

export async function buildResidentSheet(opts: ResidentSheetOptions): Promise<{ buffer: Buffer; rows: GeneratedRow[] }> {
  const rand = rng(opts.seed ?? 1);
  const def = FORM_5A1;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(def.sheetName);
  let offset = 0;
  if (opts.title) {
    ws.getCell('A1').value = 'PROVINSI: KALIMANTAN SELATAN';
    ws.getCell('A2').value = 'KABUPATEN/KOTA: KOTA BANJARMASIN';
    ws.getCell('A3').value = `TAHUN ANGGARAN: ${opts.year ?? 2026}`;
    offset = 4;
  }
  drawHeader(ws, def, offset);
  const helper = opts.helperColumns ?? true;
  const base = lastColumnIndex(def);
  if (helper) {
    ws.getCell(`${columnLetter(base + 1)}${offset + 2}`).value = 'RT';
    ws.getCell(`${columnLetter(base + 2)}${offset + 2}`).value = 'RW';
  }

  const errors = Math.min(opts.errors ?? 0, opts.rows);
  const errorEvery = errors > 0 ? opts.rows / errors : Infinity;
  const out: GeneratedRow[] = [];
  let nikNo = opts.nikStart ?? 1;
  let errIdx = 0;
  let familyNo = Math.floor((opts.nikStart ?? 1) / 4) + 1;

  for (let i = 0; i < opts.rows; i++) {
    const rowNumber = offset + def.headerLastRow + 1 + i;
    const isError = errors > 0 && Math.floor(i / errorEvery) !== Math.floor((i - 1) / errorEvery) && errIdx < errors;
    const kind: ErrorKind | null = isError ? ERROR_KINDS[errIdx++ % ERROR_KINDS.length]! : null;
    const head = i % 4 === 0;
    if (head) familyNo++;
    const zone = opts.zones[i % opts.zones.length]!;
    const rw = kind === 'luar_kawasan' ? '99' : zone.rw;
    const rt = zone.rt ?? String(1 + Math.floor(rand() * 9));
    const nik = syntheticNik(nikNo++);
    const year = 1940 + Math.floor(rand() * 85);
    const name = `${FIRST[Math.floor(rand() * FIRST.length)]} ${LAST[Math.floor(rand() * LAST.length)]} ${i + 1}`;
    const special = rand() < 0.05;
    const values: Record<string, unknown> = {
      A: i + 1,
      B: head && kind !== 'nama_kosong' ? name : '',
      C: !head && kind !== 'nama_kosong' ? name : '',
      D: kind === 'nik_pendek' ? nik.slice(0, 10) : nik,
      E: kind === 'kk_pendek' ? '9812' : syntheticKk(familyNo),
      F: kind === 'jk_salah' ? 'X' : rand() < 0.5 ? 'L' : 'P',
      G: 'Banjarmasin',
      H: kind === 'tanggal_salah' ? '31/02/2001' : `${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}/${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}/${year}`,
      I: helper ? `Jl. Sintetis No. ${i + 1}` : `Jl. Sintetis No. ${i + 1} RT ${rt} RW ${rw}`,
      J: opts.kelurahan,
      K: opts.kecamatan,
      L: kind === 'ekonomi_salah' ? 'sedang' : rand() < 0.3 ? 'miskin' : 'tidak miskin',
      M: kind === 'kebutuhan_kosong' || special ? 'ya' : 'tidak',
      N: special && kind !== 'kebutuhan_kosong' ? 'Disabilitas fisik' : '',
    };
    const row = ws.getRow(rowNumber);
    for (const [col, v] of Object.entries(values)) row.getCell(col).value = v as ExcelJS.CellValue;
    row.getCell('D').numFmt = '@';
    if (helper) {
      row.getCell(base + 1).value = rt;
      row.getCell(base + 2).value = rw;
    }
    out.push({ rowNumber, nik: kind === 'nik_pendek' ? null : nik, error: kind });
  }
  return { buffer: Buffer.from(await wb.xlsx.writeBuffer()), rows: out };
}
