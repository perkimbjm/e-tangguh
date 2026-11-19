import { z } from 'zod';
import { AGE_GROUPS } from './age-group';
import { MAX_HAZARD_MASK } from './hazards';

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD');
const rtRw = z.string().trim().regex(/^\d{1,3}$/, 'Isi angka RT/RW').transform((v) => String(Number(v)));
const id16 = z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().length(16, 'Harus 16 digit'));

export const APPROVAL_STATUSES = ['menunggu', 'disetujui', 'dikembalikan'] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];
export const INACTIVE_REASONS = ['meninggal', 'pindah', 'lainnya'] as const;

const residentBase = z.object({
  fullName: z.string().trim().min(1, 'Nama wajib diisi').max(200),
  gender: z.enum(['L', 'P'], { message: 'Pilih L atau P' }),
  birthPlace: z.string().trim().max(100).nullish(),
  birthDate: isoDate,
  nik: id16.nullish(),
  noNikReason: z.string().trim().max(300).nullish(),
  kk: id16.nullish(),
  isFamilyHead: z.boolean().default(false),
  kelurahanId: uuid,
  rw: rtRw,
  rt: rtRw.nullish(),
  address: z.string().trim().min(1, 'Alamat wajib diisi').max(300),
  isPoor: z.boolean(),
  hasSpecialNeeds: z.boolean(),
  specialNeeds: z.string().trim().max(300).nullish(),
  hazardMask: z.number().int().min(1).max(MAX_HAZARD_MASK).optional(),
  source: z.string().trim().max(200).optional(),
  sourceDate: isoDate.optional(),
});

function refineResident<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((v: z.infer<typeof residentBase>, ctx) => {
    if (!v.nik && !v.noNikReason?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['noNikReason'], message: 'Isi NIK atau alasan NIK belum ada' });
    }
    if (v.hasSpecialNeeds && !v.specialNeeds?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['specialNeeds'], message: 'Jenis kebutuhan khusus wajib diisi' });
    }
  });
}

export const createResidentSchema = refineResident(residentBase);
export type CreateResidentRequest = z.infer<typeof residentBase>;

export const updateResidentSchema = residentBase
  .omit({ nik: true, noNikReason: true })
  .partial()
  .extend({
    rowVersion: z.number().int().min(1),
    ageGroup: z.enum(AGE_GROUPS).optional(),
    ageGroupOverrideReason: z.string().trim().max(300).nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.ageGroup && !v.ageGroupOverrideReason?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['ageGroupOverrideReason'], message: 'Alasan koreksi kelompok umur wajib diisi' });
    }
    if (v.hasSpecialNeeds && !v.specialNeeds?.trim()) {
      ctx.addIssue({ code: 'custom', path: ['specialNeeds'], message: 'Jenis kebutuhan khusus wajib diisi' });
    }
  });
export type UpdateResidentRequest = z.infer<typeof updateResidentSchema>;

export const deactivateResidentSchema = z.object({
  reason: z.enum(INACTIVE_REASONS),
  date: isoDate,
  rowVersion: z.number().int().min(1),
});
export type DeactivateResidentRequest = z.infer<typeof deactivateResidentSchema>;

export const listResidentsQuerySchema = z.object({
  kelurahan: uuid.optional(),
  rw: z.string().optional(),
  rt: z.string().optional(),
  status: z.enum(APPROVAL_STATUSES).optional(),
  active: z.enum(['true', 'false']).optional(),
  q: z.string().trim().max(100).optional(),
  nik: z.string().optional(),
  batch: uuid.optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ListResidentsQuery = z.infer<typeof listResidentsQuerySchema>;

export const approveResidentsSchema = z
  .object({ batchId: uuid.optional(), kelurahanId: uuid.optional(), ids: z.array(uuid).max(5000).optional() })
  .refine((v) => [v.batchId, v.kelurahanId, v.ids].filter((x) => x !== undefined).length === 1, 'Pilih tepat satu: berkas, kelurahan, atau daftar baris');
export type ApproveResidentsRequest = z.infer<typeof approveResidentsSchema>;

export const returnResidentsSchema = z.object({
  ids: z.array(uuid).min(1).max(5000),
  note: z.string().trim().min(3, 'Catatan pengembalian wajib diisi').max(1000),
});
export type ReturnResidentsRequest = z.infer<typeof returnResidentsSchema>;

/** Baris daftar: NIK/KK tersamar (empat digit terakhir). */
export interface ResidentListItem {
  id: string;
  personId: string;
  fullName: string;
  gender: 'L' | 'P';
  birthDate: string | null;
  nikMasked: string | null;
  kkMasked: string | null;
  isFamilyHead: boolean;
  kelurahanId: string;
  kelurahanName: string;
  rw: string;
  rt: string | null;
  ageGroup: (typeof AGE_GROUPS)[number];
  hazardMask: number;
  isPoor: boolean;
  hasSpecialNeeds: boolean;
  isActive: boolean;
  approvalStatus: ApprovalStatus;
  approvalNote: string | null;
  rowVersion: number;
}

export interface ResidentDetail extends ResidentListItem {
  nik: string | null;
  noNikReason: string | null;
  kk: string | null;
  birthPlace: string | null;
  address: string;
  specialNeeds: string | null;
  inactiveReason: string | null;
  inactiveDate: string | null;
  ageGroupOverrideReason: string | null;
  source: string | null;
  sourceDate: string | null;
}

export interface Paged<T> {
  items: T[];
  nextCursor: string | null;
}

export interface CompletenessRow {
  kelurahanId: string;
  kelurahanName: string;
  kecamatanName: string | null;
  total: number;
  pending: number;
  returned: number;
  incomplete: number;
  withoutNik: number;
}

export const createCorrectionSchema = z.object({
  personId: uuid,
  requestedVia: z.string().trim().min(2, 'Isi saluran permintaan (mis. surat, datang langsung)').max(100),
  message: z.string().trim().min(5, 'Uraikan data yang diminta dibetulkan').max(2000),
});
export type CreateCorrectionRequest = z.infer<typeof createCorrectionSchema>;

export const mergePersonSchema = z.object({ targetPersonId: uuid });
export type MergePersonRequest = z.infer<typeof mergePersonSchema>;
