import { and, eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLog, fiscalYears, residentRecords } from '../../src/db/schema';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { type SpmYear, addZone, residentBody, setupSpmYear } from '../support/spm';

describe('akses dan persetujuan data warga', () => {
  let t: TestApp;
  let y: SpmYear;
  let pendata: LoggedIn;
  let op: LoggedIn;
  let residentId: string;

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2032);
    await addZone(t, y.fyId, y.sungaiMiai, '1');
    await addZone(t, y.fyId, y.pelambuan, '4', '2');
    pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    op = await loginAs(t, 'operator_bpbd');
  });
  afterAll(() => t.close());

  const url = (p = '') => `/api/v1/spm/${y.year}/residents${p}`;

  it('isian pendata berstatus menunggu; jenis bencana terisi dari kawasan', async () => {
    const res = await pendata.agent.post(url()).set('x-csrf-token', pendata.csrf).send(residentBody(y.sungaiMiai)).expect(201);
    residentId = res.body.id;
    expect(res.body.approvalStatus).toBe('menunggu');
    const [row] = await t.db.root.select().from(residentRecords).where(eq(residentRecords.id, residentId));
    expect(row!.hazardMask).toBe(4);
    expect(row!.ageGroup).toBe('dewasa');
  });

  it('pendata tidak dapat membaca atau menulis kelurahan lain (403)', async () => {
    await pendata.agent.get(url(`?kelurahan=${y.pelambuan}`)).expect(403);
    await pendata.agent
      .post(url())
      .set('x-csrf-token', pendata.csrf)
      .send(residentBody(y.pelambuan, { nik: '9900000000009002', rw: '4', rt: '2' }))
      .expect(403);
  });

  it('RT/RW di luar kawasan rawan ditolak', async () => {
    const res = await op.agent.post(url()).set('x-csrf-token', op.csrf).send(residentBody(y.sungaiMiai, { nik: '9900000000009003', rw: '9' })).expect(400);
    expect(res.body.error.code).toBe('DI_LUAR_KAWASAN_RAWAN');
  });

  it('daftar tidak memuat NIK/KK utuh; rincian memuat dan tercatat audit', async () => {
    const list = await op.agent.get(url()).expect(200);
    const body = JSON.stringify(list.body);
    expect(body).not.toContain('9900000000009001');
    expect(body).not.toContain('9800000000009001');
    expect(list.body.items[0].nikMasked).toBe('************9001');

    const detail = await op.agent.get(url(`/${residentId}`)).expect(200);
    expect(detail.body.nik).toBe('9900000000009001');
    expect(detail.body.address).toBe('Jl. Sintetis No. 1');
    const audits = await t.db.root.select().from(auditLog).where(and(eq(auditLog.action, 'resident.view'), eq(auditLog.entityId, residentId)));
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits[0]!.detail)).not.toContain('9900000000009001');
  });

  it('pencarian NIK cocok persis lewat indeks buta', async () => {
    const res = await op.agent.get(url('?nik=9900000000009001')).expect(200);
    expect(res.body.items).toHaveLength(1);
  });

  it('pendata tidak dapat menyetujui; operator menyetujui per kelurahan', async () => {
    await pendata.agent.post(url('/approve')).set('x-csrf-token', pendata.csrf).send({ kelurahanId: y.sungaiMiai }).expect(403);
    const res = await op.agent.post(url('/approve')).set('x-csrf-token', op.csrf).send({ kelurahanId: y.sungaiMiai }).expect(200);
    expect(res.body.approved).toBe(1);
  });

  it('pengembalian wajib catatan; perubahan pendata kembali menunggu', async () => {
    await op.agent.post(url('/return')).set('x-csrf-token', op.csrf).send({ ids: [residentId], note: '' }).expect(400);
    await op.agent.post(url('/return')).set('x-csrf-token', op.csrf).send({ ids: [residentId], note: 'Alamat belum lengkap' }).expect(200);
    const [row] = await t.db.root.select().from(residentRecords).where(eq(residentRecords.id, residentId));
    expect(row!.approvalStatus).toBe('dikembalikan');
    const res = await pendata.agent
      .patch(url(`/${residentId}`))
      .set('x-csrf-token', pendata.csrf)
      .send({ address: 'Jl. Sintetis No. 1A', rowVersion: row!.rowVersion })
      .expect(200);
    expect(res.body.approvalStatus).toBe('menunggu');
  });

  it('row_version usang → 409', async () => {
    const res = await op.agent.patch(url(`/${residentId}`)).set('x-csrf-token', op.csrf).send({ isPoor: false, rowVersion: 1 }).expect(409);
    expect(res.body.error.code).toBe('VERSI_USANG');
  });

  it('warga yang sama tidak dapat dicatat dua kali pada tahun yang sama', async () => {
    const res = await op.agent.post(url()).set('x-csrf-token', op.csrf).send(residentBody(y.sungaiMiai)).expect(409);
    expect(res.body.error.code).toBe('WARGA_SUDAH_TERCATAT');
  });

  it('tahun final: layanan menolak 423 dan pemicu basis data menolak tulis langsung', async () => {
    await t.db.root.update(fiscalYears).set({ status: 'final' }).where(eq(fiscalYears.id, y.fyId));
    const res = await op.agent.post(url()).set('x-csrf-token', op.csrf).send(residentBody(y.sungaiMiai, { nik: '9900000000009010' })).expect(423);
    expect(res.body.error.code).toBe('TAHUN_FINAL');
    await expect(t.db.root.execute(sql`UPDATE resident_records SET is_poor = false WHERE id = ${residentId}`)).rejects.toMatchObject({ code: 'ET423' });
    await t.db.root.update(fiscalYears).set({ status: 'terbuka' }).where(eq(fiscalYears.id, y.fyId));
  });

  it('peran di luar SPM ditolak', async () => {
    const relawan = await loginAs(t, 'relawan');
    await relawan.agent.get(url()).expect(403);
  });
});
