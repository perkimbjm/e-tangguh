import { type FormDefinition, columnLetter, lastColumnIndex } from '@etangguh/shared';
import type ExcelJS from 'exceljs';

const THIN: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  left: { style: 'thin' },
  bottom: { style: 'thin' },
  right: { style: 'thin' },
};

function shiftRef(ref: string, offset: number): string {
  return ref.replace(/(\d+)/g, (n) => String(Number(n) + offset));
}

/**
 * Menggambar kepala resmi formulir (isi sel, sel gabung, penomoran kolom) persis seperti
 * `FormDefinition`, mulai baris `startRow`. Mengembalikan nomor baris data pertama.
 */
export function drawFormHeader(ws: ExcelJS.Worksheet, def: FormDefinition, startRow = 1): number {
  const offset = startRow - 1;
  const lastCol = lastColumnIndex(def);
  for (const c of def.columns) ws.getColumn(c.letter).width = c.width ?? 14;
  for (let r = 1; r <= def.headerLastRow; r++) {
    for (let col = 1; col <= lastCol; col++) {
      const cell = ws.getCell(r + offset, col);
      cell.border = THIN;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.font = { bold: r < def.headerLastRow, size: r === def.headerLastRow ? 9 : 10 };
      if (r === def.headerLastRow) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFEFEF' } };
    }
  }
  for (const [ref, value] of Object.entries(def.cells)) {
    const cell = ws.getCell(shiftRef(ref, offset));
    cell.value = /^\d+$/.test(value) && ref.endsWith(String(def.headerLastRow)) ? Number(value) : value;
  }
  for (const range of def.merged) ws.mergeCells(shiftRef(range, offset));
  ws.getRow(1 + offset).height = 24;
  return def.headerLastRow + offset + 1;
}

/** Kolom bantu (mis. RT, RW) di kanan kolom formulir, tanpa nomor kolom resmi. */
export function drawHelperColumns(ws: ExcelJS.Worksheet, def: FormDefinition, startRow = 1): Map<string, string> {
  const letters = new Map<string, string>();
  let col = lastColumnIndex(def) + 1;
  for (const h of def.helperColumns ?? []) {
    const letter = columnLetter(col++);
    const top = startRow + 1;
    ws.mergeCells(`${letter}${top}:${letter}${top + 1}`);
    const cell = ws.getCell(`${letter}${top}`);
    cell.value = h.label;
    cell.font = { bold: true, color: { argb: 'FF7A4B00' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF4D6' } };
    cell.border = THIN;
    ws.getColumn(letter).width = h.key === 'noNikReason' ? 24 : 8;
    letters.set(h.key, letter);
  }
  return letters;
}
