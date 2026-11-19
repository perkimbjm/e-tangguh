import { FORM_5A9, FORM_5A10, FORM_5A11, FORM_5A12, type FormDefinition, reportRow } from '@etangguh/shared';
import { eq, sql } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { fiscalYears, persons } from '../../src/db/schema';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { type SpmYear, addZone, residentBody, setupSpmYear } from '../support/spm';

const binary = (res: { on: (e: string, cb: (c?: Buffer) => void) => void }, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c) => chunks.push(c!));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};
const REF = path.resolve(__dirname, '../../../../specs/002-spm-data-dasar/reference/form-headers');
const at = (h: number) => new Date(Date.UTC(2029, 0, 10, 0, 0) + h * 3600_000).toISOString();

describe('kejadian bencana, korban, petugas aktif (US4)', () => {
  let t: TestApp;
  let y: SpmYear;
  let op: LoggedIn;
  let eventId: string;
  let officerId: string;
  const url = (p = '') => `/api/v1/spm/${y.year}/events${p}`;

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2029);
    await addZone(t, y.fyId, y.sungaiMiai, '1', null, 4);
    op = await loginAs(t, 'operator_bpbd');
    await op.agent.post(`/api/v1/spm/${y.year}/residents`).set('x-csrf-token', op.csrf).send(residentBody(y.sungaiMiai, { nik: '9902900000000001', kk: '9802900000000001' })).expect(201);
    const off = await op.agent
      .post(`/api/v1/spm/${y.year}/officers`)
      .set('x-csrf-token', op.csrf)
      .send({ fullName: 'Petugas Aktif', gender: 'L', nik: '9902900000000009', position: 'linmas', dutyKelurahanId: y.sungaiMiai, isPpe: true })
      .expect(201);
    officerId = off.body.id;
  }, 60_000);
  afterAll(() => t.close());

  const base = (o: Record<string, unknown> = {}) => ({ name: 'Banjir Sintetis', hazardCode: 'banjir', occurredAt: at(0), reportedAt: at(1), locationText: 'RW 01 Sungai Miai', kelurahanId: y.sungaiMiai, ...o });

  it('kategori status darurat: tanpa penetapan, 10 jam, 30 jam setelah laporan', async () => {
    const none = await op.agent.post(url()).set('x-csrf-token', op.csrf).send(base()).expect(201);
    const ten = await op.agent.post(url()).set('x-csrf-token', op.csrf).send(base({ name: 'Banjir B', emergencyDeclaredAt: at(11), lon: 114.59, lat: -3.31 })).expect(201);
    const thirty = await op.agent.post(url()).set('x-csrf-token', op.csrf).send(base({ name: 'Banjir C', emergencyDeclaredAt: at(31) })).expect(201);
    expect(none.body.emergencyStatus).toBe('tidak_dikeluarkan');
    expect(ten.body).toMatchObject({ emergencyStatus: 'kurang_24_jam', lon: 114.59, lat: -3.31 });
    expect(thirty.body.emergencyStatus).toBe('lebih_24_jam');
    eventId = none.body.id;
    const bad = await op.agent.post(url()).set('x-csrf-token', op.csrf).send(base({ reportedAt: at(-1) })).expect(400);
    expect(bad.body.error.fields).toHaveProperty('reportedAt');
  });

  it('warga yang sudah tercatat dipakai ulang; korban baru tanpa catatan membuat orang baru', async () => {
    const existing = await op.agent.post(url(`/${eventId}/affected`)).set('x-csrf-token', op.csrf).send({ nik: '9902900000000001', fullName: 'Diabaikan', gender: 'L', status: 'medis_darurat' }).expect(201);
    expect(existing.body.personCreated).toBe(false);
    const before = await t.db.root.select({ n: sql<number>`count(*)` }).from(persons);
    const fresh = await op.agent.post(url(`/${eventId}/affected`)).set('x-csrf-token', op.csrf).send({ fullName: 'Korban Baru', gender: 'P', noNikReason: 'identitas belum diketahui', status: 'hilang', isDisplaced: true }).expect(201);
    expect(fresh.body.personCreated).toBe(true);
    const after = await t.db.root.select({ n: sql<number>`count(*)` }).from(persons);
    expect(Number(after[0]!.n)).toBe(Number(before[0]!.n) + 1);
    await op.agent.post(url(`/${eventId}/affected`)).set('x-csrf-token', op.csrf).send({ personId: existing.body.personId, status: 'selamat' }).expect(409);
  });

  it('perubahan status korban menambah riwayat; riwayat tidak dapat diubah', async () => {
    const list1 = (await op.agent.get(url(`/${eventId}/affected`)).expect(200)).body.items as { personId: string; fullName: string; history: unknown[] }[];
    const target = list1.find((a) => a.fullName === 'Korban Baru')!;
    await op.agent.patch(url(`/${eventId}/affected/${target.personId}`)).set('x-csrf-token', op.csrf).send({ status: 'meninggal', note: 'ditemukan' }).expect(200);
    const list2 = (await op.agent.get(url(`/${eventId}/affected`)).expect(200)).body.items as { fullName: string; status: string; history: { status: string }[] }[];
    const after = list2.find((a) => a.fullName === 'Korban Baru')!;
    expect(after.status).toBe('meninggal');
    expect(after.history.map((h) => h.status)).toEqual(['hilang', 'meninggal']);
    await expect(t.db.root.execute(sql`UPDATE affected_status_history SET note = 'ubah'`)).rejects.toMatchObject({ code: 'ET403' });
  });

  it('petugas aktif harus tercatat pada tahun yang sama; dapat diubah dan dihapus', async () => {
    await op.agent.put(url(`/${eventId}/officers/${officerId}`)).set('x-csrf-token', op.csrf).send({ isPpe: true, postType: 'pos_lapangan', postKelurahanId: y.sungaiMiai }).expect(200);
    await op.agent.put(url(`/${eventId}/officers/00000000-0000-4000-8000-000000000000`)).set('x-csrf-token', op.csrf).send({}).expect(400);
    const list = (await op.agent.get(url(`/${eventId}/officers`)).expect(200)).body.items;
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ isPpe: true, postType: 'pos_lapangan' });
  });

  const cases: [string, FormDefinition][] = [
    ['5.A.9', FORM_5A9],
    ['5.A.10', FORM_5A10],
    ['5.A.11', FORM_5A11],
    ['5.A.12', FORM_5A12],
  ];
  it.each(cases)('ekspor Form %s sama dengan kepala rujukan dan memuat data', async (code, def) => {
    const res = await op.agent.get(`/api/v1/spm/${y.year}/forms/${code}/export?format=xlsx&event=${code === '5.A.12' ? '' : eventId}`).buffer(true).parse(binary).expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(res.body as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    const ref = JSON.parse(readFileSync(path.join(REF, `form-${code.replace(/\./g, '').toLowerCase()}.header.json`), 'utf8')) as { cells: Record<string, string>; merged_ranges: string[]; official_title?: string };
    const map = (r: string) => r.replace(/(\d+)/g, (n) => String(reportRow(def, Number(n))));
    for (const [k, v] of Object.entries(ref.cells)) expect(String(ws.getCell(map(k)).value ?? ''), `${code} ${k}`).toBe(v);
    const merges = new Set((ws.model as unknown as { merges: string[] }).merges);
    for (const m of ref.merged_ranges) expect(merges.has(map(m)), `${code} ${m}`).toBe(true);
    if (ref.official_title) expect(String(ws.getCell('A1').value)).toContain(ref.official_title);
    const first = ws.getRow(reportRow(def, def.headerLastRow) + 1);
    expect(first.getCell('B').value, code).toBeTruthy();
  });

  it('5.A.10 mencentang status dan peran; 5.A.12 mencentang kategori status darurat', async () => {
    const r10 = await op.agent.get(`/api/v1/spm/${y.year}/forms/5.A.10/export?format=xlsx&event=${eventId}`).buffer(true).parse(binary).expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(r10.body as ArrayBuffer);
    const ws = wb.worksheets[0]!;
    const rows = [reportRow(FORM_5A10, 3) + 1, reportRow(FORM_5A10, 3) + 2].map((n) => ws.getRow(n));
    const korban = rows.find((r) => r.getCell('B').value === 'Korban Baru')!;
    expect(korban.getCell('H').value).toBe('✓'); // meninggal
    expect(korban.getCell('M').value).toBeNull();
    const warga = rows.find((r) => r.getCell('B').value !== 'Korban Baru')!;
    expect(warga.getCell('J').value).toBe('✓'); // medis darurat
    expect(warga.getCell('M').value).toBe('✓'); // warga rawan bencana

    const r12 = await op.agent.get(`/api/v1/spm/${y.year}/forms/5.A.12/export?format=xlsx`).buffer(true).parse(binary).expect(200);
    const wb2 = new ExcelJS.Workbook();
    await wb2.xlsx.load(r12.body as ArrayBuffer);
    const ws2 = wb2.worksheets[0]!;
    const start = reportRow(FORM_5A12, 3) + 1;
    const marks = [0, 1, 2].map((i) => ['G', 'H', 'I'].map((c) => ws2.getRow(start + i).getCell(c).value ?? '').join(''));
    expect(marks.sort()).toEqual(['✓', '✓', '✓']);
    expect(String(ws2.getRow(start).getCell('D').value)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('tahun final: kejadian dan korban tidak dapat ditulis (layanan dan pemicu)', async () => {
    await t.db.root.update(fiscalYears).set({ status: 'final' }).where(eq(fiscalYears.id, y.fyId));
    await op.agent.post(url(`/${eventId}/affected`)).set('x-csrf-token', op.csrf).send({ fullName: 'X', gender: 'L', noNikReason: 'x', status: 'selamat' }).expect(423);
    await expect(t.db.root.execute(sql`UPDATE affected_persons SET is_displaced = true`)).rejects.toMatchObject({ code: 'ET423' });
    await t.db.root.update(fiscalYears).set({ status: 'terbuka' }).where(eq(fiscalYears.id, y.fyId));
  });

  it('pendata tidak dapat membuka kejadian', async () => {
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    await pendata.agent.get(url()).expect(403);
    await pendata.agent.get(`/api/v1/spm/${y.year}/forms/5.A.12/export?format=xlsx`).expect(403);
  });
});
