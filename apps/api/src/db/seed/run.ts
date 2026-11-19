import { type Database, createDatabase, createPool } from '../client';

export async function withDatabase(fn: (db: Database) => Promise<void>): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diatur');
  const pool = createPool(url, 1);
  try {
    await fn(createDatabase(pool));
  } finally {
    await pool.end();
  }
}

export function exitOnError(promise: Promise<void>): void {
  promise.catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  });
}
