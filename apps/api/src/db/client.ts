import { AsyncLocalStorage } from 'node:async_hooks';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Schema = typeof schema;
export type Database = NodePgDatabase<Schema>;
/** Transaksi Drizzle; memiliki API kueri yang sama dengan `Database`. */
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DbExecutor = Database | Tx;

export function createPool(connectionString: string, max = 10): Pool {
  return new Pool({ connectionString, max });
}

export function createDatabase(pool: Pool): Database {
  return drizzle(pool, { schema });
}

/**
 * Konteks transaksi per permintaan. Repository memanggil `executor()` sehingga otomatis ikut
 * transaksi yang sedang berjalan (mis. transaksi yang dibuka interseptor audit).
 */
export class TransactionContext {
  private readonly storage = new AsyncLocalStorage<Tx>();

  constructor(private readonly db: Database) {}

  get root(): Database {
    return this.db;
  }

  executor(): DbExecutor {
    return this.storage.getStore() ?? this.db;
  }

  inTransaction(): boolean {
    return this.storage.getStore() !== undefined;
  }

  /** Menjalankan `fn` dalam transaksi; bila sudah dalam transaksi, memakai savepoint. */
  async transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    const current = this.storage.getStore();
    const runner = current ?? this.db;
    return runner.transaction((tx) => this.storage.run(tx, () => fn(tx)));
  }
}
