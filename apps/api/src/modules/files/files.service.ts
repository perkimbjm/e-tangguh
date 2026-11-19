import { Inject, Injectable } from '@nestjs/common';
import type { SessionUser } from '@etangguh/shared';
import { eq } from 'drizzle-orm';
import { createHash, randomUUID } from 'node:crypto';
import { DbService } from '../../db/db.module';
import { files } from '../../db/schema';
import { ApiException } from '../../common/errors/api-exception';
import { sniffMime, type SniffedMime } from './mime-sniff';
import { FILE_STORAGE, type FileStorage } from './storage.interface';

export type FileKind = (typeof files.$inferInsert)['kind'];
export type FileRow = typeof files.$inferSelect;

export interface SaveFileInput {
  data: Buffer;
  kind: FileKind;
  ownerUserId: string | null;
  allowed: readonly SniffedMime[];
  maxBytes: number;
  originalName?: string;
}

const PRIVILEGED = new Set(['admin_bpbd', 'super_admin']);

@Injectable()
export class FilesService {
  constructor(
    private readonly db: DbService,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  async save(input: SaveFileInput): Promise<FileRow> {
    if (input.data.length > input.maxBytes) {
      throw ApiException.payloadTooLarge(`Berkas melebihi ${Math.floor(input.maxBytes / 1_048_576)} MB`);
    }
    const mime = sniffMime(input.data);
    if (!mime || !input.allowed.includes(mime)) {
      throw ApiException.validation({ file: 'Jenis berkas tidak diizinkan' });
    }
    const name = randomUUID();
    const storageKey = `${name.slice(0, 2)}/${name}`;
    await this.storage.put(storageKey, input.data);
    try {
      const [row] = await this.db
        .executor()
        .insert(files)
        .values({
          ownerUserId: input.ownerUserId,
          kind: input.kind,
          mime,
          size: input.data.length,
          storageKey,
          sha256: createHash('sha256').update(input.data).digest('hex'),
          originalName: input.originalName?.slice(0, 255) ?? null,
        })
        .returning();
      return row!;
    } catch (err) {
      await this.storage.remove(storageKey);
      throw err;
    }
  }

  async get(id: string): Promise<FileRow> {
    const [row] = await this.db.executor().select().from(files).where(eq(files.id, id)).limit(1);
    if (!row) throw ApiException.notFound('Berkas tidak ditemukan');
    return row;
  }

  /** Otorisasi unduh: pemilik, atau admin BPBD/super admin. */
  async authorize(id: string, user: SessionUser): Promise<FileRow> {
    const row = await this.get(id);
    if (row.ownerUserId !== user.id && !PRIVILEGED.has(user.role)) throw ApiException.forbidden();
    return row;
  }

  /** Menghapus isi berkas dan catatannya (mis. berkas impor berisi data warga setelah diproses). */
  async remove(row: FileRow): Promise<void> {
    await this.db.executor().delete(files).where(eq(files.id, row.id));
    await this.storage.remove(row.storageKey);
  }

  read(row: FileRow): Promise<Buffer> {
    return this.storage.read(row.storageKey);
  }

  stream(row: FileRow) {
    return this.storage.stream(row.storageKey);
  }
}
