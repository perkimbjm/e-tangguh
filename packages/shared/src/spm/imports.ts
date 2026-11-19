import { z } from 'zod';
import type { RowError } from './validation/error-codes';

export const IMPORT_FORM_CODES = ['5.A.1', '5.A.2'] as const;
export type ImportFormCode = (typeof IMPORT_FORM_CODES)[number];
export const IMPORT_MAX_BYTES = 10 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 20_000;

export type ImportOutcome = 'baru' | 'berubah' | 'sama' | 'ditolak';
export type ImportStatus = 'divalidasi' | 'dikonfirmasi' | 'dibatalkan';

export interface RegionChoice {
  spelling: string;
  level: 'kelurahan';
  candidates: { id: string; name: string; score: number }[];
  chosenId: string | null;
}

export interface ImportPreview {
  id: string;
  formCode: ImportFormCode;
  status: ImportStatus;
  rowsTotal: number;
  rowsNew: number;
  rowsChanged: number;
  rowsUnchanged: number;
  rowsRejected: number;
  regionChoices: RegionChoice[];
  warnings: string[];
  errors: { rowNumber: number; errors: RowError[] }[];
  errorsTruncated: boolean;
}

export const regionMappingSchema = z.object({
  mappings: z.array(z.object({ spelling: z.string().min(1).max(100), regionId: z.string().uuid() })).min(1).max(500),
});
export type RegionMappingRequest = z.infer<typeof regionMappingSchema>;
