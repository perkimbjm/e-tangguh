import { type CellValue, type FormDefinition, IMPORT_MAX_ROWS, cellText, columnIndex } from '@etangguh/shared';
import ExcelJS from 'exceljs';
import { Readable } from 'node:stream';
import { ApiException } from '../../../common/errors/api-exception';
import { isBlank, plainCell } from './xlsx-cell';

export interface SheetRow {
  rowNumber: number;
  values: Record<string, CellValue>;
}

export interface ReadSheetResult {
  sheetName: string;
  headerRow: number;
  year: number | null;
  rows: SheetRow[];
}

const HEADER_SCAN_LIMIT = 40;
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3));

/** Baris penomoran: memuat angka 1, 2, 3, … minimal lima berurutan. Mengembalikan nomor → indeks kolom. */
function numberingMap(values: CellValue[]): Map<number, number> | null {
  const map = new Map<number, number>();
  values.forEach((v, col) => {
    // Sel penomoran yang terlanjur berformat tanggal terbaca sebagai Date (seri 1900).
    const t = v instanceof Date && v.getUTCFullYear() <= 1900 ? String(Math.round((v.getTime() - Date.UTC(1899, 11, 30)) / 86_400_000)) : cellText(v);
    if (/^\d{1,2}$/.test(t)) map.set(Number(t), col);
  });
  for (let n = 1; n <= 5; n++) if (!map.has(n)) return null;
  return map;
}

/** Teks kepala resmi per huruf kolom (gabungan baris di atas penomoran). */
function definitionHeaderText(def: FormDefinition, letter: string): string {
  return Object.entries(def.cells)
    .filter(([ref]) => ref.replace(/\d+/g, '') === letter && Number(ref.replace(/\D/g, '')) < def.headerLastRow)
    .map(([, v]) => v)
    .join(' ');
}

interface Layout {
  columns: Map<string, number>;
  problems: string[];
}

function resolveLayout(def: FormDefinition, numbering: Map<number, number>, above: CellValue[][]): Layout {
  const columns = new Map<string, number>();
  const problems: string[] = [];
  const headerAt = (col: number) => above.map((r) => cellText(r[col])).join(' ');

  for (const c of def.columns) {
    if (c.derived || c.number === null) continue;
    const col = numbering.get(c.number);
    if (col === undefined) {
      problems.push(`kolom ${c.number} (${c.label}) tidak ditemukan`);
      continue;
    }
    if (col !== columnIndex(c.letter)) {
      problems.push(`kolom ${c.number} (${c.label}) berada di posisi berbeda dari formulir resmi`);
      continue;
    }
    const sheetText = headerAt(col);
    if (sheetText.trim()) {
      const expected = words(definitionHeaderText(def, c.letter));
      const actual = words(sheetText);
      if (expected.size > 0 && ![...actual].some((w) => expected.has(w))) {
        problems.push(`kolom ${c.number} berjudul "${sheetText.trim().slice(0, 40)}", seharusnya "${c.label}"`);
        continue;
      }
    }
    columns.set(c.key, col);
  }
  for (const h of def.helperColumns ?? []) {
    const width = Math.max(...above.map((r) => r.length), 0);
    for (let col = 1; col < width; col++) {
      if ([...columns.values()].includes(col)) continue;
      const t = headerAt(col).toLowerCase().replace(/\s+/g, ' ').trim();
      if (t && h.aliases.includes(t)) {
        columns.set(h.key, col);
        break;
      }
    }
  }
  return { columns, problems };
}

function detectYear(rows: CellValue[][]): number | null {
  for (const r of rows) {
    const m = /TAHUN\s+ANGGARAN\s*:?\s*(\d{4})/i.exec(r.map((v) => cellText(v)).join(' '));
    if (m) return Number(m[1]);
  }
  return null;
}

/**
 * Membaca lembar kerja secara beraliran. Lembar dipilih menurut nama (bila diberikan) atau lembar
 * pertama yang memuat baris penomoran kolom. Susunan kolom yang tidak cocok menolak seluruh berkas.
 */
export async function readFormSheet(buffer: Buffer, def: FormDefinition, sheetName?: string): Promise<ReadSheetResult> {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(Readable.from(buffer), {
    sharedStrings: 'cache',
    styles: 'cache',
    hyperlinks: 'ignore',
    worksheets: 'emit',
    entries: 'emit',
  });
  let lastProblems: string[] | null = null;

  for await (const worksheet of reader) {
    const ws = worksheet as unknown as AsyncIterable<{ number: number; values: unknown[] }> & { name?: string };
    const name = (worksheet as unknown as { name?: string }).name ?? '';
    if (sheetName && name !== sheetName) continue;
    const before: CellValue[][] = [];
    let layout: Layout | null = null;
    let headerRow = 0;
    const rows: SheetRow[] = [];

    for await (const row of ws) {
      const values = (row.values ?? []).map(plainCell);
      if (!layout) {
        if (row.number > HEADER_SCAN_LIMIT) break;
        const numbering = numberingMap(values);
        if (numbering) {
          layout = resolveLayout(def, numbering, before.slice(-3));
          headerRow = row.number;
          if (layout.problems.length) break;
        } else {
          before.push(values);
        }
        continue;
      }
      const record: Record<string, CellValue> = {};
      let empty = true;
      for (const [key, col] of layout.columns) {
        const v = values[col] ?? null;
        record[key] = v;
        if (key !== 'no' && !isBlank(v)) empty = false;
      }
      if (empty) continue;
      if (rows.length >= IMPORT_MAX_ROWS) {
        throw ApiException.validation({ file: `Berkas melebihi ${IMPORT_MAX_ROWS.toLocaleString('id-ID')} baris data` });
      }
      rows.push({ rowNumber: row.number, values: record });
    }

    if (layout && layout.problems.length === 0) {
      return { sheetName: name, headerRow, year: detectYear(before), rows };
    }
    if (layout) lastProblems = layout.problems;
  }

  if (lastProblems) {
    throw new ApiException(400, 'SUSUNAN_KOLOM_TIDAK_SESUAI', `Susunan kolom tidak sesuai Form ${def.formCode}: ${lastProblems.join('; ')}`, {
      file: lastProblems.join('; '),
    });
  }
  throw new ApiException(400, 'SUSUNAN_KOLOM_TIDAK_SESUAI', `Baris penomoran kolom Form ${def.formCode} tidak ditemukan`, {
    file: 'Pastikan lembar memuat baris penomoran kolom (1, 2, 3, …) di bawah judul kolom',
  });
}
