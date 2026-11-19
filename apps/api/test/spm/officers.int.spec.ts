import { FORM_5A5, type RecapTable, reportRow } from '@etangguh/shared';
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { type SpmYear, addZone, residentBody, setupSpmYear } from '../support/spm';

const binary = (res: { on: (e: string, cb: (c?: Buffer) => void) => void }, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c) => chunks.push(c!));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};
const cellValue = (t: RecapTable, rowKey: string, colKey: string) => {
  const c = t.rows.find((r) => r.key === rowKey)?.cells[colKey];
  return c && 'value' in c ? c.value : c && 'text' in c ? c.text : undefined;
};

async function officerSheet(rows: Record<string, unknown>[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(FORM_5A5.sheetName);
  for (const [ref, v] of Object.entries(FORM_5A5.cells)) ws.getCell(ref).value = v;
  ws.getCell('AC2').value = 'JABATAN';
  ws.getCell('AD2').value = 'KELURAHAN TUGAS';
  rows.forEach((r, i) => {
    const row = ws.getRow(4 + i);
    for (const [col, v] of Object.entries(r)) row.getCell(col).value = v as ExcelJS.CellValue;
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('petugas dan aparatur (US3)', () => {
  let t: TestApp;
  let y: SpmYear;
  let op: LoggedIn;
  const url = (p = '') => `/api/v1/spm/${y.year}/officers${p}`;
  const NIK_WARGA = '9902800000000001';

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2028);
    await addZone(t, y.fyId, y.sungaiMiai, '1', null, 4);
    await addZone(t, y.fyId, y.kuinUtara, '1', null, 68);
    op = await loginAs(t, 'operator_bpbd');
    await op.agent.post(`/api/v1/spm/${y.year}/residents`).set('x-csrf-token', op.csrf).send(residentBody(y.sungaiMiai, { nik: NIK_WARGA, kk: '9802800000000001' })).expect(201);
  }, 60_000);
  afterAll(() => t.close());

  it('NIK yang sudah tercatat sebagai warga memakai catatan orang yang sama; status mengikuti jabatan', async () => {
    const res = await op.agent
      .post(url())
      .set('x-csrf-token', op.csrf)
      .send({ fullName: 'Nama Diabaikan', gender: 'P', nik: NIK_WARGA, position: 'babinsa', employmentStatus: 'pns', dutyKelurahanId: y.sungaiMiai, isTrcPdb: true })
      .expect(201);
    expect(res.body).toMatchObject({ employmentStatus: 'tni', isResident: true, fullName: 'Warga Sintetis', hazardMask: 4 });
    await op.agent.post(url()).set('x-csrf-token', op.csrf).send({ fullName: 'X', gender: 'L', nik: NIK_WARGA, position: 'relawan', dutyKelurahanId: y.sungaiMiai }).expect(409);
  });

  it('kelurahan tugas wajib kecuali jabatan lainnya; relawan dari modul relawan → 501', async () => {
    const bad = await op.agent.post(url()).set('x-csrf-token', op.csrf).send({ fullName: 'Y', gender: 'L', nik: '9902800000000099', position: 'linmas' }).expect(400);
    expect(bad.body.error.fields).toHaveProperty('dutyKelurahanId');
    const r = await op.agent.post(url('/from-volunteer/00000000-0000-4000-8000-000000000001')).set('x-csrf-token', op.csrf).send({ dutyKelurahanId: y.sungaiMiai }).expect(501);
    expect(r.body.error.code).toBe('MODUL_RELAWAN_BELUM_TERSEDIA');
  });

  it('impor Form 5.A.5: baris benar tersimpan, baris dua status ditolak', async () => {
    const buffer = await officerSheet([
      { A: 1, B: 'Relawan Sintetis', C: '9902800000000002', E: 'L', I: 'Sungai Miai', T: 'v', W: 'v', Z: 'v', AC: 'relawan', AD: 'Sungai Miai', U: 'Sertifikat PPGD' },
      { A: 2, B: 'Linmas Sintetis', C: '9902800000000003', E: 'P', I: 'Kuin Utara', R: 'v', Y: 'v' },
      { A: 3, B: 'Salah Sintetis', C: '9902800000000004', E: 'L', I: 'Kuin Utara', O: 'v', P: 'v' },
    ]);
    const up = await op.agent.post(`/api/v1/spm/${y.year}/imports`).set('x-csrf-token', op.csrf).field('formCode', '5.A.5').attach('file', buffer, 'petugas.xlsx').expect(201);
    expect(up.body).toMatchObject({ rowsNew: 2, rowsRejected: 1 });
    expect(up.body.warnings.join(' ')).toMatch(/diasumsikan sama dengan kelurahan domisili/);
    await op.agent.post(`/api/v1/spm/${y.year}/imports/${up.body.id}/confirm`).set('x-csrf-token', op.csrf).expect(200);
    const list = (await op.agent.get(url()).expect(200)).body.items as { fullName: string; position: string; dutyKelurahanId: string; hazardMask: number }[];
    expect(list.map((o) => o.fullName).sort()).toEqual(['Linmas Sintetis', 'Relawan Sintetis', 'Warga Sintetis']);
    const linmas = list.find((o) => o.fullName === 'Linmas Sintetis')!;
    expect(linmas).toMatchObject({ position: 'linmas', dutyKelurahanId: y.kuinUtara, hazardMask: 68 });
  });

  it('petugas terhitung pada 5.A.4 (menurut kelurahan tugas) dan 5.A.6; penelusuran = nilai', async () => {
    const r4 = (await op.agent.get(`/api/v1/spm/${y.year}/recap/5.A.4`).expect(200)).body as RecapTable;
    const sm = `kel:${y.sungaiMiai}`;
    const ku = `kel:${y.kuinUtara}`;
    expect(cellValue(r4, sm, 'c5')).toBe(1); // Babinsa → TNI
    expect(cellValue(r4, ku, 'c7')).toBe(1); // Linmas → Satlinmas
    expect(cellValue(r4, sm, 'c14')).toBe('Relawan: 1 orang');
    expect(cellValue(r4, 'total', 'c5')).toBe(1);
    const r6 = (await op.agent.get(`/api/v1/spm/${y.year}/recap/5.A.6`).expect(200)).body as RecapTable;
    expect(cellValue(r6, 'hazard:banjir', 'c6')).toBe(1); // TRC PDB (babinsa)
    expect(cellValue(r6, 'hazard:banjir', 'c7')).toBe(1); // TRC KLB (relawan)
    expect(cellValue(r6, 'hazard:banjir', 'c8')).toBe(1); // PPE (linmas, mask 68 memuat banjir)
    expect(cellValue(r6, 'hazard:banjir', 'c10')).toBe(3);
    expect(cellValue(r6, 'hazard:angin_topan', 'c10')).toBe(1);
    expect(cellValue(r6, 'hazard:banjir', 'c11')).toBe((cellValue(r6, 'hazard:banjir', 'c4') as number) + 3);
    for (const table of [r4, r6]) {
      for (const row of table.rows) {
        for (const cell of Object.values(row.cells)) {
          if (!('cellKey' in cell)) continue;
          const d = await op.agent.get(`/api/v1/spm/${y.year}/recap/${table.formCode}/cells/${cell.cellKey}/rows`).expect(200);
          expect(d.body.rows.length, cell.cellKey).toBe(cell.value);
        }
      }
    }
  }, 60_000);

  it('pendata tidak dapat membuka daftar petugas maupun menelusuri sel petugas', async () => {
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    await pendata.agent.get(url()).expect(403);
    const r4 = (await pendata.agent.get(`/api/v1/spm/${y.year}/recap/5.A.4`).expect(200)).body as RecapTable;
    const c5 = r4.rows.find((r) => r.key === `kel:${y.sungaiMiai}`)!.cells.c5!;
    await pendata.agent.get(`/api/v1/spm/${y.year}/recap/5.A.4/cells/${'cellKey' in c5 ? c5.cellKey : ''}/rows`).expect(403);
    const c9 = r4.rows.find((r) => r.key === `kel:${y.sungaiMiai}`)!.cells.c9!;
    await pendata.agent.get(`/api/v1/spm/${y.year}/recap/5.A.4/cells/${'cellKey' in c9 ? c9.cellKey : ''}/rows`).expect(200);
    await pendata.agent.post(`/api/v1/spm/${y.year}/imports`).set('x-csrf-token', pendata.csrf).field('formCode', '5.A.5').attach('file', Buffer.from('x'), 'a.xlsx').expect(403);
  });

  it('ekspor 5.A.5 sama dengan kepala rujukan; 5.A.2 mencentang peran aparatur warga yang juga petugas', async () => {
    const res = await op.agent.get(`/api/v1/spm/${y.year}/forms/5.A.5/export?format=xlsx`).buffer(true).parse(binary).expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    const ref = JSON.parse(readFileSync(path.resolve(__dirname, '../../../../specs/002-spm-data-dasar/reference/form-headers/form-5a5.header.json'), 'utf8')) as { cells: Record<string, string>; merged_ranges: string[] };
    const map = (r: string) => r.replace(/(\d+)/g, (n) => String(reportRow(FORM_5A5, Number(n))));
    for (const [k, v] of Object.entries(ref.cells)) expect(String(ws.getCell(map(k)).value ?? ''), k).toBe(v);
    const merges = new Set((ws.model as unknown as { merges: string[] }).merges);
    for (const m of ref.merged_ranges) expect(merges.has(map(m)), m).toBe(true);
    expect(ws.getRow(9).values).toBeDefined();

    const r2 = await op.agent.get(`/api/v1/spm/${y.year}/forms/5.A.2/export?format=xlsx`).buffer(true).parse(binary).expect(200);
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(r2.body as ArrayBuffer);
    const first = wb2.worksheets[0]!.getRow(9);
    expect(first.getCell('T').value).toBe('✓');
    expect(first.getCell('U').value).toBe('✓');
  });
});
