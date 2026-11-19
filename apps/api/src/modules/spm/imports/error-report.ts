import type { RowError } from '@etangguh/shared';
import ExcelJS from 'exceljs';

/** Daftar baris ditolak (tanpa nilai data pribadi): baris, kolom, kode, pesan. */
export async function buildErrorReport(rows: { rowNumber: number; errors: RowError[] }[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'e-Tangguh';
  const ws = wb.addWorksheet('Galat impor');
  ws.columns = [
    { header: 'Baris lembar kerja', key: 'row', width: 18 },
    { header: 'Nomor kolom formulir', key: 'column', width: 20 },
    { header: 'Kode', key: 'code', width: 26 },
    { header: 'Pesan', key: 'message', width: 70 },
  ];
  ws.getRow(1).font = { bold: true };
  for (const r of rows) for (const e of r.errors) ws.addRow({ row: r.rowNumber, column: e.column, code: e.code, message: e.message });
  ws.autoFilter = 'A1:D1';
  return Buffer.from(await wb.xlsx.writeBuffer());
}
