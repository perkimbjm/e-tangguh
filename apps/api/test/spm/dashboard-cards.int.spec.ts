import { scale } from '@etangguh/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { type SpmYear, addZone, residentBody, setupSpmYear } from '../support/spm';

describe('dasbor dan kartu kompetensi petugas', () => {
  let t: TestApp;
  let y: SpmYear;
  let op: LoggedIn;
  let officerId: string;

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2023);
    await addZone(t, y.fyId, y.sungaiMiai, '1', null, 68);
    op = await loginAs(t, 'operator_bpbd');
    await op.agent.post(`/api/v1/spm/${y.year}/residents`).set('x-csrf-token', op.csrf).send(residentBody(y.sungaiMiai, { nik: '9902300000000001', kk: '9802300000000001', birthDate: '2020-01-01' })).expect(201);
    const off = await op.agent
      .post(`/api/v1/spm/${y.year}/officers`)
      .set('x-csrf-token', op.csrf)
      .send({ fullName: 'Rina Sintetis Putri', gender: 'P', nik: '9902300000000009', position: 'relawan', dutyKelurahanId: y.sungaiMiai, certifications: 'PPGD; SAR air', isTrcPdb: true })
      .expect(201);
    officerId = off.body.id;
    const ev = await op.agent.post(`/api/v1/spm/${y.year}/events`).set('x-csrf-token', op.csrf).send({ name: 'Banjir', hazardCode: 'banjir', occurredAt: '2023-02-01T00:00:00Z', reportedAt: '2023-02-01T01:00:00Z', locationText: 'RW 1' }).expect(201);
    await op.agent.put(`/api/v1/spm/${y.year}/events/${ev.body.id}/officers/${officerId}`).set('x-csrf-token', op.csrf).send({ isTrcPdb: true }).expect(200);
  }, 60_000);
  afterAll(() => t.close());

  it('kartu menerapkan rumus versi 1 pada data petugas, tanpa NIK', async () => {
    const res = await op.agent.get(`/api/v1/spm/${y.year}/officers/${officerId}/card`).expect(200);
    const c = res.body;
    expect(c).toMatchObject({ initials: 'RS', availability: 'siaga', stats: { certificates: 2, deployments: 1 }, noData: ['lat', 'kep'] });
    expect(c.attributes.values.kmp).toBe(scale(2, 10));
    expect(c.attributes.values.png).toBe(scale(1, 60));
    expect(c.attributes.values.sia).toBe(99);
    expect(c.attributes.values.lat).toBe(1);
    expect(c.attributes.approved).toBe(false);
    expect(c.attributes.breakdown.kmp.map((b: { label: string }) => b.label)).toEqual(['PPGD', 'SAR air']);
    expect(JSON.stringify(res.body)).not.toMatch(/99023\d{11}/);
    const list = await op.agent.get(`/api/v1/spm/${y.year}/officers/cards`).expect(200);
    expect(list.body.items).toHaveLength(1);
  });

  it('dasbor BPBD memuat warga, petugas, dan kejadian; pendata hanya kelurahannya tanpa petugas/kejadian', async () => {
    const d = (await op.agent.get(`/api/v1/spm/${y.year}/dashboard`).expect(200)).body;
    expect(d.residents).toMatchObject({ total: 1, approved: 1, vulnerable: 1 });
    expect(d.byHazard.find((h: { code: string }) => h.code === 'angin_topan').persons).toBe(1);
    expect(d.officers).toMatchObject({ total: 1, duties: { trcPdb: 1 } });
    expect(d.events.byMonth[1]).toBe(1);
    const pendata = await loginAs(t, 'pendata_kelurahan', y.kuinUtara);
    const p = (await pendata.agent.get(`/api/v1/spm/${y.year}/dashboard`).expect(200)).body;
    expect(p.residents.total).toBe(0);
    expect(p.officers).toBeNull();
    expect(p.events).toBeNull();
    await pendata.agent.get(`/api/v1/spm/${y.year}/officers/cards`).expect(403);
  });
});
