import { CHECK_MARK, type ReportData, columnLetter, hasTitleRow, lastColumnIndex, reportDataStartRow, reportInfoLines, reportRow } from '@etangguh/shared';
import ExcelJS from 'exceljs';
import { THIN, drawFormBlock } from './xlsx-header';

/** Menulis satu formulir sebagai lembar kerja: judul, kepala laporan, kepala resmi, data. */
export function addFormSheet(wb: ExcelJS.Workbook, data: ReportData): ExcelJS.Worksheet {
  const { def } = data;
  const ws = wb.addWorksheet(def.sheetName.slice(0, 31), { pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const lastCol = lastColumnIndex(def);
  const lastLetter = columnLetter(lastCol);

  if (!hasTitleRow(def)) {
    ws.mergeCells(`A1:${lastLetter}1`);
    ws.getCell('A1').value = def.title;
  }
  reportInfoLines(data.year).forEach((line, i) => {
    ws.mergeCells(`A${i + 2}:${lastLetter}${i + 2}`);
    const cell = ws.getCell(`A${i + 2}`);
    cell.value = line;
    cell.font = { bold: true, size: 10 };
  });
  drawFormBlock(ws, def, (r) => reportRow(def, r));
  const title = ws.getCell('A1');
  title.font = { bold: true, size: 12 };
  title.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  ws.getRow(1).height = 30;

  const start = reportDataStartRow(def);
  data.rows.forEach((row, i) => {
    const r = ws.getRow(start + i);
    for (const c of def.columns) {
      const cell = r.getCell(c.letter);
      const v = row[c.key];
      cell.value = v === true ? CHECK_MARK : v === false || v === undefined ? null : v;
      cell.border = THIN;
      cell.alignment = { vertical: 'top', wrapText: true, horizontal: typeof v === 'number' || c.kind === 'check' || c.kind === 'no' ? 'center' : 'left' };
      if (c.kind === 'id16') cell.numFmt = '@';
      if (data.boldRows?.has(i)) cell.font = { bold: true };
    }
  });
  if (data.rows.length === 0) {
    ws.mergeCells(`A${start}:${lastLetter}${start}`);
    const cell = ws.getCell(`A${start}`);
    cell.value = 'Nihil';
    cell.alignment = { horizontal: 'center' };
    cell.border = THIN;
  }
  const after = start + Math.max(1, data.rows.length) + 1;
  (data.notes ?? []).forEach((n, i) => {
    const cell = ws.getCell(`A${after + i}`);
    cell.value = `Catatan: ${n}`;
    cell.font = { italic: true, size: 9 };
  });
  ws.views = [{ state: 'frozen', ySplit: start - 1 }];
  return ws;
}

export async function writeXlsx(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'e-Tangguh';
  wb.created = new Date();
  addFormSheet(wb, data);
  return Buffer.from(await wb.xlsx.writeBuffer());
}
