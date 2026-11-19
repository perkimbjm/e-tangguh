import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditLog } from '../../src/db/schema';
import { type TestApp, createTestApp } from '../support/app';

describe('audit_log hanya-tambah', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
    await t.db.root.insert(auditLog).values({ action: 'uji', entity: 'uji' });
  });
  afterAll(() => t.close());

  it('UPDATE ditolak basis data', async () => {
    await expect(t.db.root.execute(sql`UPDATE audit_log SET action = 'ubah'`)).rejects.toMatchObject({ code: 'ET403' });
  });

  it('DELETE ditolak basis data', async () => {
    await expect(t.db.root.execute(sql`DELETE FROM audit_log`)).rejects.toMatchObject({ code: 'ET403' });
  });

  it('TRUNCATE ditolak basis data', async () => {
    await expect(t.db.root.execute(sql`TRUNCATE audit_log`)).rejects.toMatchObject({ code: 'ET403' });
  });

  it('INSERT tetap diizinkan', async () => {
    await expect(t.db.root.insert(auditLog).values({ action: 'uji2', entity: 'uji' })).resolves.toBeDefined();
  });
});
