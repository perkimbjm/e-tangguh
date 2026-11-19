import { date, jsonb, pgTable, smallint, text, unique } from 'drizzle-orm/pg-core';
import { id, timestamps } from './_columns';

/** Definisi formulir resmi berversi (susunan kolom, kepala, sel gabung). */
export const formDefinitions = pgTable(
  'form_definitions',
  {
    id: id(),
    formCode: text('form_code').notNull(),
    version: smallint('version').notNull(),
    regulationRef: text('regulation_ref').notNull(),
    title: text('title').notNull(),
    layout: jsonb('layout').notNull(),
    effectiveFrom: date('effective_from').notNull(),
    ...timestamps(),
  },
  (t) => [unique('form_definitions_code_version').on(t.formCode, t.version)],
);
