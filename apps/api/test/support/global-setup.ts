import { Client } from 'pg';
import { runMigrations } from '../../src/db/migrate';

/** Mengosongkan skema basis data uji lalu menjalankan seluruh migrasi. */
export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/etangguh_test';
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query('DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;');
  } finally {
    await client.end();
  }
  await runMigrations(url);
}
