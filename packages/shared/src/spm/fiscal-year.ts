import { z } from 'zod';
import { validateAgeBands } from './age-group';

export const FISCAL_YEAR_STATUSES = ['terbuka', 'final', 'revisi'] as const;
export type FiscalYearStatus = (typeof FISCAL_YEAR_STATUSES)[number];

export const ageBandsSchema = z
  .object({
    balitaMax: z.number().int(),
    anakMax: z.number().int(),
    lansiaMin: z.number().int(),
  })
  .superRefine((b, ctx) => {
    const msg = validateAgeBands(b);
    if (msg) ctx.addIssue({ code: 'custom', message: msg });
  });

export const createFiscalYearSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  copyFrom: z.number().int().optional(),
});
export type CreateFiscalYearRequest = z.infer<typeof createFiscalYearSchema>;

export const fiscalYearSettingsSchema = z
  .object({
    ageReferenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD'),
    ageBands: ageBandsSchema,
  })
  .partial()
  .refine((v) => v.ageReferenceDate !== undefined || v.ageBands !== undefined, 'Tidak ada perubahan');
export type FiscalYearSettingsRequest = z.infer<typeof fiscalYearSettingsSchema>;

export const revisionSchema = z.object({ reason: z.string().trim().min(10, 'Uraikan alasan revisi (minimal 10 karakter)').max(2000) });
export type RevisionRequest = z.infer<typeof revisionSchema>;

export interface SnapshotDto {
  revisionNo: number;
  reason: string | null;
  sha256: string;
  archiveSize: number;
  createdAt: string;
  createdBy: string | null;
}

export interface FinalizeResult {
  year: number;
  revisionNo: number;
  sha256: string;
  status: FiscalYearStatus;
}

export interface FiscalYearDto {
  id: string;
  year: number;
  status: FiscalYearStatus;
  revisionNo: number;
  ageReferenceDate: string;
  ageBands: { balitaMax: number; anakMax: number; lansiaMin: number };
  finalizedAt: string | null;
  revisionReason: string | null;
  copiedFromYear: number | null;
}
