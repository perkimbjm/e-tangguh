import { type FormDefinition, FORM_5A1, FORM_5A2, FORM_5A4, FORM_5A6, buildForm5A3, hasTitleRow, reportRow } from '@etangguh/shared';
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { seedKnownResidents } from '../support/recap-data';
import { type SpmYear, addZone, setupSpmYear } from '../support/spm';

const REF = path.resolve(__dirname, '../../../../specs/002-spm-data-dasar/reference/form-headers');
const golden = (code: string) =>
  JSON.parse(readFileSync(path.join(REF, `form-${code.replace(/\./g, '').toLowerCase()}.header.json`), 'utf8')) as { cells: Record<string, string>; merged_ranges: string[] };

const binary = (res: { on: (e: string, cb: (c?: Buffer) => void) => void }, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c) => chunks.push(c!));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

const mapRef = (def: FormDefinition, ref: string) => ref.replace(/(\d+)/g, (n) => String(reportRow(def, Number(n))));

describe('berkas emas ekspor XLSX', () => {
  let t: TestApp;
  let y: SpmYear;
  let op: LoggedIn;

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2027);
    await addZone(t, y.fyId, y.sungaiMiai, '1', null, 4);
    await addZone(t, y.fyId, y.sungaiMiai, '2', null, 68);
    await addZone(t, y.fyId, y.kuinUtara, '1', null, 1);
    op = await loginAs(t, 'operator_bpbd');
    await seedKnownResidents(y.year, op, await loginAs(t, 'pendata_kelurahan', y.sungaiMiai), y);
  }, 60_000);
  afterAll(() => t.close());

  const cases: [string, FormDefinition][] = [
    ['5.A.1', FORM_5A1],
    ['5.A.2', FORM_5A2],
    ['5.A.3', buildForm5A3([1, 4, 68])],
    ['5.A.4', FORM_5A4],
    ['5.A.6', FORM_5A6],
  ];

  it.each(cases)('Form %s: kepala, sel gabung, penomoran kolom sama dengan rujukan', async (code, def) => {
    const res = await op.agent.get(`/api/v1/spm/${y.year}/forms/${code}/export?format=xlsx`).buffer(true).parse(binary).expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    const ref = golden(code);
    for (const [cellRef, expected] of Object.entries(ref.cells)) {
      const actual = String(ws.getCell(mapRef(def, cellRef)).value ?? '');
      const want = code === '5.A.3' && expected === 'VARIASI n' ? 'VARIASI 3' : expected;
      expect(actual, `${code} ${cellRef}`).toBe(want);
    }
    const merges = new Set((ws.model as unknown as { merges: string[] }).merges);
    for (const m of ref.merged_ranges) expect(merges.has(mapRef(def, m)), `${code} gabung ${m}`).toBe(true);
    expect(String(ws.getCell('A1').value)).toMatch(/^FORM 5\.A\./);
    expect(String(ws.getCell(hasTitleRow(def) ? 'A2' : 'A2').value)).toMatch(/^PROVINSI/);
    expect(String(ws.getCell('A4').value)).toBe(`TAHUN ANGGARAN : ${y.year}`);
  });

  it('XLSX 5.A.1 memuat NIK utuh untuk operator; ekspor pendata menyamarkan NIK', async () => {
    const asOp = await op.agent.get(`/api/v1/spm/${y.year}/forms/5.A.1/export?format=xlsx`).buffer(true).parse(binary).expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(asOp.body as ArrayBuffer);
    const values = wb.worksheets[0]!.getColumn('D').values.map(String);
    expect(values.some((v) => /^99\d{14}$/.test(v))).toBe(true);

    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    const asK = await pendata.agent.get(`/api/v1/spm/${y.year}/forms/5.A.1/export?format=xlsx`).buffer(true).parse(binary).expect(200);
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(asK.body as ArrayBuffer);
    expect(wb2.worksheets[0]!.getColumn('D').values.map(String).some((v) => /^99\d{14}$/.test(v))).toBe(false);
    await pendata.agent.get(`/api/v1/spm/${y.year}/forms/5.A.4/export?format=xlsx`).expect(403);
  });

  it('PDF dan paket ZIP dihasilkan; ZIP memuat daftar sidik SHA-256', async () => {
    const pdf = await op.agent.get(`/api/v1/spm/${y.year}/forms/5.A.3/export?format=pdf`).buffer(true).parse(binary).expect(200);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    const zip = await op.agent.get(`/api/v1/spm/${y.year}/forms/export-all`).buffer(true).parse(binary).expect(200);
    const files = unzipSync(new Uint8Array(zip.body as Buffer));
    expect(Object.keys(files)).toHaveLength(25); // 12 formulir × (XLSX + PDF) + SHA256SUMS.txt
    expect(strFromU8(files['SHA256SUMS.txt']!)).toMatch(/form-5a1-2027\.xlsx/);
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    await pendata.agent.get(`/api/v1/spm/${y.year}/forms/export-all`).expect(403);
  }, 60_000);
});
