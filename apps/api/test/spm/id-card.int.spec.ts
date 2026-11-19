import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { type SpmYear, setupSpmYear } from '../support/spm';

// PNG 1×1 sintetis.
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f00f0004ff02fea7d6a5ca0000000049454e44ae426082', 'hex');

describe('kartu identitas virtual petugas/relawan', () => {
  let t: TestApp;
  let y: SpmYear;
  let op: LoggedIn;
  let id: string;
  let code: string;
  const year = new Date().getFullYear();

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, year + 12);
    op = await loginAs(t, 'operator_bpbd');
    const o = await op.agent
      .post(`/api/v1/spm/${y.year}/officers`)
      .set('x-csrf-token', op.csrf)
      .send({ fullName: 'Nadia Relawan Sintetis', gender: 'P', nik: '9900000000777001', position: 'relawan', dutyKelurahanId: y.sungaiMiai, certifications: 'PPGD; SAR air', isTrcPdb: true })
      .expect(201);
    id = o.body.id;
  }, 60_000);
  afterAll(() => t.close());

  it('menerbitkan kartu dengan nomor stabil; tanpa NIK', async () => {
    const a = await op.agent.get(`/api/v1/spm/${y.year}/officers/${id}/id-card`).expect(200);
    expect(a.body).toMatchObject({ category: 'relawan', initials: 'NR', hasPhoto: false, certifications: ['PPGD', 'SAR air'], duties: ['TRC PDB', 'Operasi'] });
    expect(a.body.cardNumber).toMatch(new RegExp(`^ETG-${y.year}-[0-9A-Z]{4}-[0-9A-Z]{4}$`));
    expect(JSON.stringify(a.body)).not.toContain('9900000000777001');
    code = a.body.cardCode;
    const b = await op.agent.get(`/api/v1/spm/${y.year}/officers/${id}/id-card`).expect(200);
    expect(b.body.cardCode).toBe(code);
  });

  it('unggah foto (diperiksa dari isi), ambil, dan tolak berkas bukan gambar', async () => {
    await op.agent.post(`/api/v1/spm/${y.year}/officers/${id}/photo`).set('x-csrf-token', op.csrf).attach('photo', Buffer.from('<svg/>'), 'x.png').expect(400);
    await op.agent.post(`/api/v1/spm/${y.year}/officers/${id}/photo`).set('x-csrf-token', op.csrf).attach('photo', PNG, 'foto.png').expect(200);
    const img = await op.agent.get(`/api/v1/spm/${y.year}/officers/${id}/photo`).expect(200);
    expect(img.headers['content-type']).toBe('image/png');
    expect(img.headers['cache-control']).toContain('no-store');
    expect((await op.agent.get(`/api/v1/spm/${y.year}/officers/${id}/id-card`)).body.hasPhoto).toBe(true);
  });

  it('pembingkaian foto disimpan, divalidasi, dan direset saat foto diganti', async () => {
    const url = `/api/v1/spm/${y.year}/officers/${id}`;
    expect((await op.agent.get(`${url}/id-card`)).body.photoFrame).toEqual({ x: 50, y: 30, zoom: 1 });
    await op.agent.put(`${url}/photo-frame`).set('x-csrf-token', op.csrf).send({ x: 40, y: 20, zoom: 4 }).expect(400);
    await op.agent.put(`${url}/photo-frame`).set('x-csrf-token', op.csrf).send({ x: 40, y: 20, zoom: 1.6 }).expect(200);
    expect((await op.agent.get(`${url}/id-card`)).body.photoFrame).toEqual({ x: 40, y: 20, zoom: 1.6 });
    await op.agent.post(`${url}/photo`).set('x-csrf-token', op.csrf).attach('photo', PNG, 'foto.png').expect(200);
    expect((await op.agent.get(`${url}/id-card`)).body.photoFrame).toEqual({ x: 50, y: 30, zoom: 1 });
  });

  it('verifikasi publik tanpa masuk: nama, jabatan, status berlaku; kode salah → 404', async () => {
    const res = await request(t.app.getHttpServer()).get(`/api/v1/public/verify/${code.toLowerCase()}`).expect(200);
    expect(res.body).toMatchObject({ valid: true, status: 'berlaku', fullName: 'Nadia Relawan Sintetis', positionLabel: 'Relawan kebencanaan', year: y.year, agencyName: 'BPBD Kota Banjarmasin' });
    expect(JSON.stringify(res.body)).not.toMatch(/9900000000777001|photo|nik/i);
    await request(t.app.getHttpServer()).get('/api/v1/public/verify/ZZZZZZZZ').expect(404);
    await request(t.app.getHttpServer()).get('/api/v1/public/verify/..%2Fx').expect(404);
  });

  it('pengaturan kartu hanya admin; pendata tidak dapat membuka kartu', async () => {
    await op.agent.put('/api/v1/spm/id-card/settings').set('x-csrf-token', op.csrf).send({ agencyName: 'BPBD Kota Banjarmasin' }).expect(403);
    const admin = await loginAs(t, 'admin_bpbd');
    await admin.agent.put('/api/v1/spm/id-card/settings').set('x-csrf-token', admin.csrf).send({ agencyName: 'BPBD Kota Banjarmasin', hotline: '(contoh) 112' }).expect(200);
    expect((await op.agent.get(`/api/v1/spm/${y.year}/officers/${id}/id-card`)).body.settings.hotline).toBe('(contoh) 112');
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    await pendata.agent.get(`/api/v1/spm/${y.year}/officers/${id}/id-card`).expect(403);
    await pendata.agent.get(`/api/v1/spm/${y.year}/officers/${id}/photo`).expect(403);
  });
});
