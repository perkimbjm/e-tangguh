import { FORM_5A7, FORM_5A8, type FormDefinition, reportRow } from '@etangguh/shared';
import { eq, sql } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fiscalYears } from '../../src/db/schema';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { type SpmYear, setupSpmYear } from '../support/spm';

const binary = (res: { on: (e: string, cb: (c?: Buffer) => void) => void }, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c) => chunks.push(c!));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('inventaris peralatan dan stok logistik (US5)', () => {
  let t: TestApp;
  let y: SpmYear;
  let op: LoggedIn;
  let firstId: string;

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2030);
    op = await loginAs(t, 'operator_bpbd');
  }, 60_000);
  afterAll(() => t.close());

  it('lima peralatan dan lima barang logistik tersimpan', async () => {
    for (let i = 1; i <= 5; i++) {
      const e = await op.agent
        .post(`/api/v1/spm/${y.year}/equipment`)
        .set('x-csrf-token', op.csrf)
        .send({ name: `Perahu karet ${i}`, quantity: 10, unit: 'unit', qtyGood: 8, qtyBroken: 2, supportPencarian: true, locationText: 'Gudang BPBD', institution: 'BPBD' })
        .expect(201);
      if (i === 1) firstId = e.body.id;
      await op.agent.post(`/api/v1/spm/${y.year}/logistics`).set('x-csrf-token', op.csrf).send({ name: `Selimut ${i}`, quantity: 150.5, unit: 'lembar', qtyGood: 150.5 }).expect(201);
    }
    const eq = (await op.agent.get(`/api/v1/spm/${y.year}/equipment`).expect(200)).body.items;
    const lg = (await op.agent.get(`/api/v1/spm/${y.year}/logistics`).expect(200)).body.items;
    expect(eq).toHaveLength(5);
    expect(lg).toHaveLength(5);
    expect(lg[0]).toMatchObject({ quantity: 150.5, qtyGood: 150.5, qtyBroken: 0 });
  });

  it('jumlah baik + rusak melebihi ketersediaan ditolak (validasi, layanan, dan basis data)', async () => {
    const r1 = await op.agent.post(`/api/v1/spm/${y.year}/equipment`).set('x-csrf-token', op.csrf).send({ name: 'Genset', quantity: 2, unit: 'unit', qtyGood: 2, qtyBroken: 1 }).expect(400);
    expect(r1.body.error.fields).toHaveProperty('qtyGood');
    // Perubahan sebagian digabung dengan nilai tersimpan sebelum diperiksa.
    await op.agent.patch(`/api/v1/spm/${y.year}/equipment/${firstId}`).set('x-csrf-token', op.csrf).send({ quantity: 9 }).expect(400);
    await op.agent.patch(`/api/v1/spm/${y.year}/equipment/${firstId}`).set('x-csrf-token', op.csrf).send({ quantity: 12 }).expect(200);
    await expect(t.db.root.execute(sql`UPDATE equipment SET qty_broken = 100 WHERE id = ${firstId}`)).rejects.toMatchObject({ code: '23514' });
  });

  it.each<[string, FormDefinition]>([
    ['5.A.7', FORM_5A7],
    ['5.A.8', FORM_5A8],
  ])('ekspor Form %s sama dengan kepala rujukan dan memuat data', async (code, def) => {
    const res = await op.agent.get(`/api/v1/spm/${y.year}/forms/${code}/export?format=xlsx`).buffer(true).parse(binary).expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    const ref = JSON.parse(readFileSync(path.resolve(__dirname, `../../../../specs/002-spm-data-dasar/reference/form-headers/form-${code.replace(/\./g, '').toLowerCase()}.header.json`), 'utf8')) as {
      cells: Record<string, string>;
      merged_ranges: string[];
    };
    const map = (r: string) => r.replace(/(\d+)/g, (n) => String(reportRow(def, Number(n))));
    for (const [k, v] of Object.entries(ref.cells)) expect(String(ws.getCell(map(k)).value ?? ''), `${code} ${k}`).toBe(v);
    const merges = new Set((ws.model as unknown as { merges: string[] }).merges);
    for (const m of ref.merged_ranges) expect(merges.has(map(m)), `${code} ${m}`).toBe(true);
    const first = ws.getRow(reportRow(def, def.headerLastRow) + 1);
    if (code === '5.A.7') {
      expect(first.getCell('C').value).toBe('12 unit');
      expect(first.getCell('E').value).toBe('✓');
      expect(first.getCell('K').value).toBe(8);
    } else {
      expect(first.getCell('C').value).toBe('150,5 lembar');
    }
  });

  it('pendata ditolak; tahun final mengunci inventaris', async () => {
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    await pendata.agent.get(`/api/v1/spm/${y.year}/equipment`).expect(403);
    await t.db.root.update(fiscalYears).set({ status: 'final' }).where(eq(fiscalYears.id, y.fyId));
    await op.agent.delete(`/api/v1/spm/${y.year}/equipment/${firstId}`).set('x-csrf-token', op.csrf).expect(423);
    await expect(t.db.root.execute(sql`DELETE FROM logistics_stock`)).rejects.toMatchObject({ code: 'ET423' });
    await t.db.root.update(fiscalYears).set({ status: 'terbuka' }).where(eq(fiscalYears.id, y.fyId));
  });
});
