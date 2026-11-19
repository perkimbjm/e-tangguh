import path from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createDatabase, createPool } from './client';

/** Menjalankan migrasi berversi terhadap DATABASE_URL. */
export async function runMigrations(url: string): Promise<void> {
  const pool = createPool(url, 1);
  try {
    await migrate(createDatabase(pool), {
      migrationsFolder: path.join(__dirname, 'migrations'),
    });
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL belum diatur');
  runMigrations(url)
    .then(() => console.warn('Migrasi selesai'))
    .catch((err: unknown) => {
      console.error(err);
      process.exit(1);
    });
}
