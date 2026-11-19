import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLog } from '../../src/db/schema';
import { type TestApp, createTestApp, createUser, login } from '../support/app';

describe('autentikasi', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());

  it('masuk memasang cookie httpOnly SameSite=Lax dan mengembalikan token CSRF', async () => {
    const user = await createUser(t.db, 'operator_bpbd');
    const res = await request(t.app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: user.email, password: 'kata-sandi-uji-panjang' })
      .expect(200);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/etg_session=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(res.body.csrfToken).toBeTruthy();
    expect(res.body.user).toMatchObject({ id: user.id, role: 'operator_bpbd' });
    expect(JSON.stringify(res.body)).not.toContain('password');

    const entries = await t.db.root.select().from(auditLog).where(eq(auditLog.entityId, user.id));
    expect(entries.filter((e) => e.action === 'auth.login')).toHaveLength(1);
  });

  it('kata sandi salah → 401 dengan pesan sama seperti akun tidak ada', async () => {
    const user = await createUser(t.db, 'operator_bpbd');
    const wrong = await request(t.app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: user.email, password: 'salah' });
    const none = await request(t.app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: 'tidakada@uji.invalid', password: 'salah' });
    expect(wrong.status).toBe(401);
    expect(none.status).toBe(401);
    expect(wrong.body).toEqual(none.body);
  });

  it('GET /auth/me tanpa sesi → 401; dengan sesi → profil', async () => {
    await request(t.app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    const user = await createUser(t.db, 'admin_bpbd');
    const s = await login(t.app, user.email!);
    const me = await s.agent.get('/api/v1/auth/me').expect(200);
    expect(me.body.user.id).toBe(user.id);
  });

  it('metode pengubah tanpa token CSRF ditolak 403', async () => {
    const user = await createUser(t.db, 'admin_bpbd');
    const s = await login(t.app, user.email!);
    const res = await s.agent.post('/api/v1/auth/logout').expect(403);
    expect(res.body.error.code).toBe('CSRF_TIDAK_VALID');
    await s.agent.post('/api/v1/auth/logout').set('x-csrf-token', s.csrf).expect(204);
    await s.agent.get('/api/v1/auth/me').expect(401);
  });

  it('percobaan masuk dibatasi lajunya (429)', async () => {
    const user = await createUser(t.db, 'operator_bpbd');
    const server = t.app.getHttpServer();
    for (let i = 0; i < 10; i++) {
      await request(server).post('/api/v1/auth/login').send({ identifier: user.email, password: 'salah' }).expect(401);
    }
    await request(server).post('/api/v1/auth/login').send({ identifier: user.email, password: 'kata-sandi-uji-panjang' }).expect(429);
  });

  it('galat validasi memakai bentuk { error: { code, message, fields } }', async () => {
    const res = await request(t.app.getHttpServer()).post('/api/v1/auth/login').send({ identifier: '' }).expect(400);
    expect(res.body.error.code).toBe('VALIDASI');
    expect(res.body.error.fields).toHaveProperty('identifier');
  });
});
