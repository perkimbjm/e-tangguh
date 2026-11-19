import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { loadEnv } from '../../../config/env';
import { DbService } from '../../../db/db.module';
import { importBatches } from '../../../db/schema';
import { FilesService } from '../../files/files.service';
import { ImportsRepository } from './imports.repository';
import { SENSITIVE_IMPORT_KEYS } from './row-seal';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Pembersih data mentah impor (contracts/import.md): NIK/KK dan kolom sensitif lain pada
 * `import_rows` serta berkas unggahan dihapus saat konfirmasi/batal, dan lewat tugas harian untuk
 * berkas berusia lebih dari 7 hari.
 */
@Injectable()
export class ImportCleanup implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger('ImportCleanup');
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly repo: ImportsRepository,
    private readonly files: FilesService,
    private readonly db: DbService,
  ) {}

  onModuleInit(): void {
    if (loadEnv().NODE_ENV === 'test') return;
    const run = () => void this.purgeExpired().catch((e: unknown) => this.logger.error(`Pembersihan gagal: ${(e as Error).message}`));
    setTimeout(run, 60_000).unref();
    this.timer = setInterval(run, DAY_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Dipanggil dalam transaksi berjalan (konfirmasi/batal) atau oleh tugas harian. */
  async purgeBatch(batchId: string, fileId: string | null): Promise<void> {
    await this.repo.purgeRows(batchId, SENSITIVE_IMPORT_KEYS);
    await this.repo.updateBatch(batchId, { purgedAt: new Date(), fileId: null });
    if (fileId) {
      const file = await this.files.get(fileId).catch(() => null);
      if (file) await this.files.remove(file);
    }
  }

  async purgeExpired(now = new Date()): Promise<number> {
    const batches = await this.repo.expiredUnpurged(new Date(now.getTime() - RETENTION_MS));
    for (const b of batches) {
      await this.db.transaction(async () => {
        await this.purgeBatch(b.id, b.fileId);
        // Berkas yang belum dikonfirmasi setelah 7 hari dianggap batal.
        await this.db.executor().update(importBatches).set({ status: 'dibatalkan' }).where(and(eq(importBatches.id, b.id), eq(importBatches.status, 'divalidasi')));
      });
    }
    return batches.length;
  }
}
