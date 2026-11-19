import { buildResidentSheet } from '@etangguh/spm-fixtures';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { files, importBatches, importRows, residentRecords } from '../../src/db/schema';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { type SpmYear, addZone, setupSpmYear } from '../support/spm';

describe('impor Form 5.A.1', () => {
  let t: TestApp;
  let y: SpmYear;
  let op: LoggedIn;

  const upload = (s: LoggedIn, buffer: Buffer, formCode = '5.A.1') =>
    s.agent.post(`/api/v1/spm/${y.year}/imports`).set('x-csrf-token', s.csrf).field('formCode', formCode).attach('file', buffer, 'uji.xlsx');

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2031);
    await addZone(t, y.fyId, y.sungaiMiai, '1');
    await addZone(t, y.fyId, y.sungaiMiai, '2');
    await addZone(t, y.fyId, y.kuinUtara, '1');
    op = await loginAs(t, 'operator_bpbd');
  });
  afterAll(() => t.close());

  it('1.000 baris dengan 50 salah → 950 baru, 50 ditolak; konfirmasi; unggah ulang → 0 baru, 0 berubah', async () => {
    const { buffer } = await buildResidentSheet({ rows: 1000, errors: 50, kelurahan: 'Sungai Miai', kecamatan: 'Banjarmasin Utara', zones: [{ rw: '1' }, { rw: '2' }], title: true, year: y.year });
    const started = Date.now();
    const res = await upload(op, buffer).expect(201);
    expect(Date.now() - started).toBeLessThan(15_000);
    expect(res.body).toMatchObject({ rowsTotal: 1000, rowsNew: 950, rowsRejected: 50, rowsChanged: 0, status: 'divalidasi' });
    for (const r of res.body.errors) {
      expect(r.rowNumber).toBeGreaterThan(0);
      for (const e of r.errors) {
        expect(e.code).toBeTruthy();
        expect(e.column).toBeGreaterThan(0);
        expect(e.message).toBeTruthy();
      }
    }
    const codes = new Set(res.body.errors.flatMap((r: { errors: { code: string }[] }) => r.errors.map((e) => e.code)));
    expect(codes).toContain('DI_LUAR_KAWASAN_RAWAN');
    expect(codes).toContain('NIK_PANJANG');

    const errorsXlsx = await op.agent.get(`/api/v1/spm/${y.year}/imports/${res.body.id}/errors.xlsx`).expect(200);
    expect(errorsXlsx.headers['content-type']).toContain('spreadsheetml');

    const confirmed = await op.agent.post(`/api/v1/spm/${y.year}/imports/${res.body.id}/confirm`).set('x-csrf-token', op.csrf).expect(200);
    expect(confirmed.body.status).toBe('dikonfirmasi');
    const [count] = await t.db.root
      .select({ n: sql<number>`count(*)`, approved: sql<number>`count(*) filter (where approval_status = 'disetujui')` })
      .from(residentRecords)
      .where(eq(residentRecords.importBatchId, res.body.id));
    expect(Number(count!.n)).toBe(950);
    expect(Number(count!.approved)).toBe(950);

    // NIK/KK dihapus dari tabel antara dan berkas unggahan dihapus.
    const leftovers = await t.db.root.select({ n: sql<number>`count(*)` }).from(importRows).where(sql`${importRows.batchId} = ${res.body.id} AND (${importRows.raw} ? 'nik' OR ${importRows.raw} ? 'kk')`);
    expect(Number(leftovers[0]!.n)).toBe(0);
    const [batch] = await t.db.root.select().from(importBatches).where(eq(importBatches.id, res.body.id));
    expect(batch!.fileId).toBeNull();
    expect(batch!.purgedAt).not.toBeNull();

    const again = await upload(op, buffer).expect(201);
    expect(again.body).toMatchObject({ rowsNew: 0, rowsChanged: 0, rowsUnchanged: 950, rowsRejected: 50 });
    expect(again.body.warnings[0]).toMatch(/pernah dikonfirmasi/);
    await op.agent.post(`/api/v1/spm/${y.year}/imports/${again.body.id}/cancel`).set('x-csrf-token', op.csrf).expect(200);
  }, 60_000);

  it('ejaan kelurahan mirip ditawarkan sebagai pilihan; setelah dipilih baris diterima', async () => {
    const { buffer } = await buildResidentSheet({ rows: 5, kelurahan: 'Kuin Utra', kecamatan: 'Banjarmasin Utara', zones: [{ rw: '1' }], nikStart: 50_000 });
    const res = await upload(op, buffer).expect(201);
    expect(res.body.rowsRejected).toBe(5);
    expect(res.body.regionChoices).toHaveLength(1);
    expect(res.body.regionChoices[0].candidates.map((c: { id: string }) => c.id)).toContain(y.kuinUtara);
    const mapped = await op.agent
      .post(`/api/v1/spm/${y.year}/imports/${res.body.id}/region-mapping`)
      .set('x-csrf-token', op.csrf)
      .send({ mappings: [{ spelling: 'Kuin Utra', regionId: y.kuinUtara }] })
      .expect(200);
    expect(mapped.body).toMatchObject({ rowsNew: 5, rowsRejected: 0 });
  });

  it('pendata mengunggah kelurahan lain → WILAYAH_BUKAN_HAK; batch milik orang lain → 403', async () => {
    const pendata = await loginAs(t, 'pendata_kelurahan', y.pelambuan);
    const { buffer } = await buildResidentSheet({ rows: 3, kelurahan: 'Sungai Miai', kecamatan: 'Banjarmasin Utara', zones: [{ rw: '1' }], nikStart: 60_000 });
    const res = await upload(pendata, buffer).expect(201);
    expect(res.body.rowsRejected).toBe(3);
    expect(res.body.errors[0].errors[0].code).toBe('WILAYAH_BUKAN_HAK');
    const other = await loginAs(t, 'pendata_kelurahan', y.pelambuan);
    await other.agent.get(`/api/v1/spm/${y.year}/imports/${res.body.id}`).expect(403);
  });

  it('baris pendata yang dikonfirmasi berstatus menunggu', async () => {
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    const { buffer } = await buildResidentSheet({ rows: 4, kelurahan: 'Sungai Miai', kecamatan: 'Banjarmasin Utara', zones: [{ rw: '2' }], nikStart: 70_000, helperColumns: false });
    const res = await upload(pendata, buffer).expect(201);
    expect(res.body.rowsNew).toBe(4);
    await pendata.agent.post(`/api/v1/spm/${y.year}/imports/${res.body.id}/confirm`).set('x-csrf-token', pendata.csrf).expect(200);
    const rows = await t.db.root.select({ s: residentRecords.approvalStatus }).from(residentRecords).where(eq(residentRecords.importBatchId, res.body.id));
    expect(rows.map((r) => r.s)).toEqual(['menunggu', 'menunggu', 'menunggu', 'menunggu']);
  });

  it('susunan kolom tidak cocok menolak seluruh berkas', async () => {
    const { buffer } = await buildResidentSheet({ rows: 2, kelurahan: 'Sungai Miai', kecamatan: 'Banjarmasin Utara', zones: [{ rw: '1' }], nikStart: 80_000 });
    const res = await upload(op, buffer, '5.A.2').expect(400);
    expect(res.body.error.code).toBe('SUSUNAN_KOLOM_TIDAK_SESUAI');
  });

  it('templat unduhan dapat langsung diunggah kembali (kepala dikenali, 0 baris)', async () => {
    const tpl = await op.agent.get(`/api/v1/spm/templates/5.A.1?ta=${y.year}`).buffer(true).parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => cb(null, Buffer.concat(chunks)));
    }).expect(200);
    const res = await upload(op, tpl.body as Buffer);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ rowsTotal: 0, rowsRejected: 0 });
  });

  it('tahun anggaran pada kepala berkas yang berbeda ditolak', async () => {
    const { buffer } = await buildResidentSheet({ rows: 1, kelurahan: 'Sungai Miai', kecamatan: 'Banjarmasin Utara', zones: [{ rw: '1' }], title: true, year: 2020, nikStart: 90_000 });
    const res = await upload(op, buffer).expect(400);
    expect(res.body.error.fields.file).toMatch(/2020/);
  });

  it('berkas bukan XLSX ditolak dari isinya', async () => {
    const res = await upload(op, Buffer.from('NIK,NAMA\n1,a')).expect(400);
    expect(res.body.error.fields.file).toMatch(/Jenis berkas/);
    const [n] = await t.db.root.select({ n: sql<number>`count(*)` }).from(files).where(eq(files.mime, 'text/csv'));
    expect(Number(n!.n)).toBe(0);
  });
});
