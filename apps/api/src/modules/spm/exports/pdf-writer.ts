import { type FormDefinition, type ReportData, columnIndex, hasTitleRow, lastColumnIndex, reportInfoLines } from '@etangguh/shared';
import PdfPrinter from 'pdfmake';
import type { Content, TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const vfs = require('pdfmake/build/vfs_fonts') as Record<string, string> & { pdfMake?: { vfs: Record<string, string> } };
/** Roboto tidak memuat ✓; tanda akar (√) dipakai sebagai centang pada PDF. */
const PDF_CHECK = '√';
/** Lebar minimum (pt) agar NIK/KK 16 digit dan tanggal dd/mm/yyyy tidak terpotong. */
const MIN_WIDTH: Partial<Record<string, number>> = { id16: 66, date: 44 };

const fontFile = (name: string) => Buffer.from((vfs.pdfMake?.vfs ?? vfs)[name]!, 'base64');
const printer = new PdfPrinter({
  Roboto: {
    normal: fontFile('Roboto-Regular.ttf'),
    bold: fontFile('Roboto-Medium.ttf'),
    italics: fontFile('Roboto-Italic.ttf'),
    bolditalics: fontFile('Roboto-MediumItalic.ttf'),
  },
});

function parseRange(range: string) {
  const [a, b] = range.split(':') as [string, string];
  const p = (ref: string) => ({ col: columnIndex(ref.replace(/\d+/g, '')), row: Number(ref.replace(/\D+/g, '')) });
  return { from: p(a), to: p(b) };
}

/** Baris kepala pdfmake dari sel dan sel gabung definisi (tanpa baris judul). */
export function headerRows(def: FormDefinition): TableCell[][] {
  const lastCol = lastColumnIndex(def);
  const firstRow = hasTitleRow(def) ? 2 : 1;
  const covered = new Set<string>();
  const spans = new Map<string, { colSpan: number; rowSpan: number }>();
  for (const m of def.merged.map(parseRange)) {
    if (m.from.row < firstRow) continue;
    const to = Math.min(m.to.col, lastCol);
    spans.set(`${m.from.row}:${m.from.col}`, { colSpan: to - m.from.col + 1, rowSpan: m.to.row - m.from.row + 1 });
    for (let r = m.from.row; r <= m.to.row; r++) for (let c = m.from.col; c <= to; c++) if (r !== m.from.row || c !== m.from.col) covered.add(`${r}:${c}`);
  }
  const textAt = new Map<string, string>();
  for (const [ref, v] of Object.entries(def.cells)) textAt.set(`${Number(ref.replace(/\D+/g, ''))}:${columnIndex(ref.replace(/\d+/g, ''))}`, v);
  const rows: TableCell[][] = [];
  for (let r = firstRow; r <= def.headerLastRow; r++) {
    const row: TableCell[] = [];
    for (let c = 1; c <= lastCol; c++) {
      const k = `${r}:${c}`;
      if (covered.has(k)) {
        row.push({ text: '' });
        continue;
      }
      row.push({
        text: textAt.get(k) ?? '',
        bold: r < def.headerLastRow,
        fontSize: r === def.headerLastRow ? 6 : 6.5,
        alignment: 'center',
        fillColor: r === def.headerLastRow ? '#EFEFEF' : undefined,
        ...(spans.get(k) ?? {}),
      });
    }
    rows.push(row);
  }
  return rows;
}

/** PDF lanskap dari definisi formulir dan data yang sama dengan XLSX. */
export function writePdf(data: ReportData): Promise<Buffer> {
  const { def } = data;
  const lastCol = lastColumnIndex(def);
  const byIndex = new Map(def.columns.map((c) => [columnIndex(c.letter), c]));
  const header = headerRows(def);
  const body: TableCell[][] = data.rows.map((row, i) =>
    Array.from({ length: lastCol }, (_, j) => {
      const col = byIndex.get(j + 1);
      const v = col ? row[col.key] : null;
      const text = v === true ? PDF_CHECK : v === false || v === null || v === undefined ? '' : String(v);
      return { text, fontSize: 6.5, bold: data.boldRows?.has(i), alignment: typeof v === 'number' || v === true ? 'center' : 'left' } as TableCell;
    }),
  );
  if (body.length === 0) body.push([{ text: 'Nihil', colSpan: lastCol, alignment: 'center', fontSize: 7 }, ...Array.from({ length: lastCol - 1 }, () => ({ text: '' }))]);
  // Lebar numerik proporsional terhadap lebar kolom XLSX; A4 lanskap 842 pt dikurangi margin dan padding sel.
  const raw = Array.from({ length: lastCol }, (_, j) => byIndex.get(j + 1)?.width ?? 10);
  const usable = 842 - 40 - lastCol * 9;
  const sum = raw.reduce((a, b) => a + b, 0);
  let widths = raw.map((w) => Math.max(12, Math.floor((w / sum) * usable)));
  const mins = new Map(def.columns.filter((c) => MIN_WIDTH[c.kind]).map((c) => [columnIndex(c.letter) - 1, MIN_WIDTH[c.kind]!]));
  const extra = [...mins].reduce((a, [i, m]) => a + Math.max(0, m - widths[i]!), 0);
  if (extra > 0) {
    const others = widths.reduce((a, w, i) => (mins.has(i) ? a : a + w), 0);
    widths = widths.map((w, i) => (mins.has(i) ? Math.max(w, mins.get(i)!) : Math.max(10, Math.floor(w - (w / others) * extra))));
  }

  const content: Content[] = [
    { text: def.title, bold: true, fontSize: 10, alignment: 'center', margin: [0, 0, 0, 4] },
    ...reportInfoLines(data.year).map((t) => ({ text: t, fontSize: 8, bold: true })),
    {
      margin: [0, 6, 0, 0],
      table: { headerRows: header.length, widths, body: [...header, ...body] },
      layout: { hLineWidth: () => 0.4, vLineWidth: () => 0.4 },
    },
    ...(data.notes ?? []).map((n) => ({ text: `Catatan: ${n}`, italics: true, fontSize: 7, margin: [0, 4, 0, 0] as [number, number, number, number] })),
  ];
  const doc: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [20, 24, 20, 28],
    defaultStyle: { font: 'Roboto' },
    info: { title: def.title, creator: 'e-Tangguh' },
    footer: (page, pages) => ({ text: `${def.formCode} · halaman ${page} dari ${pages}`, fontSize: 7, alignment: 'right', margin: [0, 8, 20, 0] }),
    content,
  };
  return new Promise((resolve, reject) => {
    const pdf = printer.createPdfKitDocument(doc);
    const chunks: Buffer[] = [];
    pdf.on('data', (c: Buffer) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    pdf.end();
  });
}
