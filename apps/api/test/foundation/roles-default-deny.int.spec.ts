import { Controller, Get } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Roles } from '../../src/common/decorators/roles.decorator';
import { type TestApp, createTestApp, loginAs } from '../support/app';

@Controller('uji-probe')
class ProbeController {
  @Get('tanpa-peran')
  noRoles() {
    return { ok: true };
  }

  @Roles('admin_bpbd')
  @Get('admin')
  adminOnly() {
    return { ok: true };
  }
}

describe('akses default ditolak', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp([ProbeController]);
  });
  afterAll(() => t.close());

  it('rute tanpa @Roles mengembalikan 403 bahkan untuk super_admin', async () => {
    const s = await loginAs(t, 'super_admin');
    const res = await s.agent.get('/api/v1/uji-probe/tanpa-peran').expect(403);
    expect(res.body.error.code).toBe('TIDAK_BERWENANG');
  });

  it('peran tidak cocok → 403, peran cocok → 200', async () => {
    const op = await loginAs(t, 'operator_bpbd');
    await op.agent.get('/api/v1/uji-probe/admin').expect(403);
    const admin = await loginAs(t, 'admin_bpbd');
    await admin.agent.get('/api/v1/uji-probe/admin').expect(200);
  });

  it('tanpa sesi → 401', async () => {
    const { default: request } = await import('supertest');
    await request(t.app.getHttpServer()).get('/api/v1/uji-probe/admin').expect(401);
  });

  it('administrasi pengguna: operator ditolak; admin_bpbd tidak dapat membuat super_admin', async () => {
    const op = await loginAs(t, 'operator_bpbd');
    await op.agent.get('/api/v1/admin/users').expect(403);
    const admin = await loginAs(t, 'admin_bpbd');
    const res = await admin.agent
      .post('/api/v1/admin/users')
      .set('x-csrf-token', admin.csrf)
      .send({ email: 'baru@uji.invalid', password: 'kata-sandi-panjang-sekali', role: 'super_admin' });
    expect(res.status).toBe(403);
  });

  it('akun pendata_kelurahan wajib terikat tepat satu kelurahan', async () => {
    const admin = await loginAs(t, 'admin_bpbd');
    const res = await admin.agent
      .post('/api/v1/admin/users')
      .set('x-csrf-token', admin.csrf)
      .send({ email: 'pendata@uji.invalid', password: 'kata-sandi-panjang-sekali', role: 'pendata_kelurahan' })
      .expect(400);
    expect(res.body.error.fields).toHaveProperty('kelurahanId');
  });
});
