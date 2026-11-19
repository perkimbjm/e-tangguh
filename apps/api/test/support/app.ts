import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Role } from '@etangguh/shared';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { configureApp } from '../../src/bootstrap';
import { DbService } from '../../src/db/db.module';
import { hashPassword } from '../../src/modules/auth/password';
import { users } from '../../src/db/schema';

export const TEST_PASSWORD = 'kata-sandi-uji-panjang';

export interface TestApp {
  app: INestApplication;
  db: DbService;
  close(): Promise<void>;
}

export async function createTestApp(extraControllers: Type[] = []): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: extraControllers }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();
  return { app, db: app.get(DbService), close: () => app.close() };
}

let counter = 0;
const hashPromise = hashPassword(TEST_PASSWORD);

export async function createUser(db: DbService, role: Role, kelurahanId: string | null = null) {
  counter += 1;
  const email = `${role}.${counter}.${Date.now()}@uji.invalid`;
  const [row] = await db.root
    .insert(users)
    .values({ email, role, kelurahanId, passwordHash: await hashPromise })
    .returning();
  return row!;
}

export interface LoggedIn {
  agent: ReturnType<typeof request.agent>;
  csrf: string;
  userId: string;
}

export async function login(app: INestApplication, email: string, password = TEST_PASSWORD): Promise<LoggedIn> {
  const agent = request.agent(app.getHttpServer());
  const res = await agent.post('/api/v1/auth/login').send({ identifier: email, password }).expect(200);
  return { agent, csrf: res.body.csrfToken as string, userId: res.body.user.id as string };
}

export async function loginAs(t: TestApp, role: Role, kelurahanId: string | null = null): Promise<LoggedIn> {
  const user = await createUser(t.db, role, kelurahanId);
  return login(t.app, user.email!);
}
