import { bigint, pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_columns';
import { users } from './users';

export const fileKind = pgEnum('file_kind', ['foto', 'bukti', 'izin_wali', 'impor', 'arsip', 'dokumen']);

export const files = pgTable('files', {
  id: id(),
  ownerUserId: uuid('owner_user_id').references(() => users.id),
  kind: fileKind('kind').notNull(),
  mime: text('mime').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  storageKey: text('storage_key').notNull().unique(),
  sha256: text('sha256').notNull(),
  originalName: text('original_name'),
  ...timestamps(),
});
