import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { unzipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { equipment, fiscalYears, hazardZones, officerRecords, residentRecords } from '../../src/db/schema';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { type SpmYear, addZone, residentBody, setupSpmYear } from '../support/spm';

const binary = (res: { on: (e: string, cb: (c?: Buffer) => void) => void }, cb: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (c) => chunks.push(c!));
  res.on('end', () => cb(null, Buffer.concat(chunks)));
};

describe('siklus tahun anggaran: finalisasi, revisi, salin maju (US6)', () => {
  let t: TestApp;
  let y: SpmYear;
  let admin: LoggedIn;
  let op: LoggedIn;
  let residentId: string;
  const fyUrl = (p = '') => `/api/v1/spm/fiscal-years${p}`;

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2024);
    await addZone(t, y.fyId, y.sungaiMiai, '1', null, 4);
    admin = await loginAs(t, 'admin_bpbd');
    op = await loginAs(t, 'operator_bpbd');
    const r = await op.agent
      .post(`/api/v1/spm/${y.year}/residents`)
      .set('x-csrf-token', op.csrf)
      .send(residentBody(y.sungaiMiai, { nik: '9902400000000001', kk: '9802400000000001', birthDate: '1966-06-01' }))
      .expect(201);
    residentId = r.body.id;
    // 17 tahun pada 31-12-2024, 18 tahun pada 31-12-2025.
    await op.agent.post(`/api/v1/spm/${y.year}/residents`).set('x-csrf-token', op.csrf).send(residentBody(y.sungaiMiai, { nik: '9902400000000002', birthDate: '2007-03-01', isFamilyHead: false })).expect(201);
    await op.agent.post(`/api/v1/spm/${y.year}/officers`).set('x-csrf-token', op.csrf).send({ fullName: 'Babinsa', gender: 'L', nik: '9902400000000009', position: 'babinsa', dutyKelurahanId: y.sungaiMiai }).expect(201);
    await op.agent.post(`/api/v1/spm/${y.year}/equipment`).set('x-csrf-token', op.csrf).send({ name: 'Perahu', quantity: 2, unit: 'unit', qtyGood: 2 }).expect(201);
    await op.agent.post(`/api/v1/spm/${y.year}/events`).set('x-csrf-token', op.csrf).send({ name: 'Banjir', hazardCode: 'banjir', occurredAt: '2024-02-01T00:00:00Z', reportedAt: '2024-02-01T01:00:00Z', locationText: 'RW 1' }).expect(201);
  }, 60_000);
  afterAll(() => t.close());

  it('finalisasi ditolak bila ada baris menunggu; operator tidak dapat memfinalkan', async () => {
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    const pend = await pendata.agent.post(`/api/v1/spm/${y.year}/residents`).set('x-csrf-token', pendata.csrf).send(residentBody(y.sungaiMiai, { nik: '9902400000000003' })).expect(201);
    await op.agent.post(fyUrl(`/${y.year}/finalize`)).set('x-csrf-token', op.csrf).expect(403);
    const res = await admin.agent.post(fyUrl(`/${y.year}/finalize`)).set('x-csrf-token', admin.csrf).expect(409);
    expect(res.body.error.code).toBe('MASIH_ADA_MENUNGGU');
    await op.agent.post(`/api/v1/spm/${y.year}/residents/return`).set('x-csrf-token', op.csrf).send({ ids: [pend.body.id], note: 'Belum diverifikasi' }).expect(200);
  });

  it('finalisasi membuat arsip ber-SHA-256 dan mengunci tahun (layanan 423, pemicu menolak SQL langsung)', async () => {
    const fin = await admin.agent.post(fyUrl(`/${y.year}/finalize`)).set('x-csrf-token', admin.csrf).expect(201);
    expect(fin.body).toMatchObject({ status: 'final', revisionNo: 0 });
    await op.agent.patch(`/api/v1/spm/${y.year}/residents/${residentId}`).set('x-csrf-token', op.csrf).send({ isPoor: false, rowVersion: 1 }).expect(423);
    await expect(t.db.root.execute(sql`UPDATE resident_records SET is_poor = false WHERE id = ${residentId}`)).rejects.toMatchObject({ code: 'ET423' });
    const zip = await op.agent.get(fyUrl(`/${y.year}/snapshots/0/archive`)).buffer(true).parse(binary).expect(200);
    const buf = zip.body as Buffer;
    expect(createHash('sha256').update(buf).digest('hex')).toBe(fin.body.sha256);
    expect(Object.keys(unzipSync(new Uint8Array(buf)))).toContain('form-5a1-2024.xlsx');
    await admin.agent.post(fyUrl(`/${y.year}/finalize`)).set('x-csrf-token', admin.csrf).expect(409);
  }, 60_000);

  it('revisi menaikkan nomor revisi; perubahan lalu finalisasi lagi; arsip revisi 0 tetap ada', async () => {
    await admin.agent.post(fyUrl(`/${y.year}/revisions`)).set('x-csrf-token', admin.csrf).send({ reason: 'x' }).expect(400);
    const rev = await admin.agent.post(fyUrl(`/${y.year}/revisions`)).set('x-csrf-token', admin.csrf).send({ reason: 'Koreksi kondisi ekonomi satu warga' }).expect(201);
    expect(rev.body).toMatchObject({ status: 'revisi', revisionNo: 1 });
    await op.agent.patch(`/api/v1/spm/${y.year}/residents/${residentId}`).set('x-csrf-token', op.csrf).send({ isPoor: false, rowVersion: 1 }).expect(200);
    const fin = await admin.agent.post(fyUrl(`/${y.year}/finalize`)).set('x-csrf-token', admin.csrf).expect(201);
    expect(fin.body.revisionNo).toBe(1);
    const snaps = (await op.agent.get(fyUrl(`/${y.year}/snapshots`)).expect(200)).body.items as { revisionNo: number; reason: string | null; sha256: string }[];
    expect(snaps.map((s) => s.revisionNo)).toEqual([0, 1]);
    expect(snaps[1]!.reason).toBe('Koreksi kondisi ekonomi satu warga');
    expect(snaps[0]!.sha256).not.toBe(snaps[1]!.sha256);
    await op.agent.get(fyUrl(`/${y.year}/snapshots/0/archive`)).expect(200);
    await expect(t.db.root.execute(sql`DELETE FROM fiscal_year_snapshots`)).rejects.toMatchObject({ code: 'ET403' });
    await expect(t.db.root.execute(sql`DELETE FROM files WHERE kind = 'arsip'`)).rejects.toMatchObject({ code: 'ET403' });
  }, 60_000);

  it('salin maju menyalin warga aktif disetujui, kawasan, petugas, inventaris; tidak menyalin kejadian; menghitung ulang kelompok umur', async () => {
    const res = await admin.agent.post(fyUrl()).set('x-csrf-token', admin.csrf).send({ year: 2025, copyFrom: 2024 }).expect(201);
    expect(res.body).toMatchObject({ year: 2025, status: 'terbuka', copiedFromYear: 2024 });
    expect(res.body.copied).toEqual({ hazardZones: 1, residents: 2, officers: 1, equipment: 1, logistics: 0 });
    const [fy25] = await t.db.root.select().from(fiscalYears).where(eq(fiscalYears.year, 2025));
    const zones = await t.db.root.select().from(hazardZones).where(eq(hazardZones.fiscalYearId, fy25!.id));
    const rows = await t.db.root.select().from(residentRecords).where(eq(residentRecords.fiscalYearId, fy25!.id));
    expect(rows.every((r) => r.hazardZoneId === zones[0]!.id && r.approvalStatus === 'disetujui')).toBe(true);
    expect(rows.map((r) => r.ageGroup).sort()).toEqual(['dewasa', 'dewasa']);
    const [old] = await t.db.root.select().from(residentRecords).where(and(eq(residentRecords.fiscalYearId, y.fyId), eq(residentRecords.ageGroup, 'anak')));
    expect(old).toBeDefined();
    expect(await t.db.root.select().from(officerRecords).where(eq(officerRecords.fiscalYearId, fy25!.id))).toHaveLength(1);
    expect(await t.db.root.select().from(equipment).where(eq(equipment.fiscalYearId, fy25!.id))).toHaveLength(1);
    const events = (await op.agent.get('/api/v1/spm/2025/events').expect(200)).body.items;
    expect(events).toHaveLength(0);
    await admin.agent.post(fyUrl()).set('x-csrf-token', admin.csrf).send({ year: 2025, copyFrom: 2024 }).expect(409);
  });
});
