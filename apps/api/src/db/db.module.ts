import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { loadEnv } from '../config/env';
import { TransactionContext, createDatabase, createPool } from './client';

export const DB_POOL = Symbol('DB_POOL');

@Injectable()
export class DbService extends TransactionContext implements OnApplicationShutdown {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {
    super(createDatabase(pool));
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    { provide: DB_POOL, useFactory: () => createPool(loadEnv().DATABASE_URL) },
    DbService,
  ],
  exports: [DbService],
})
export class DbModule {}
