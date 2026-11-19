import { z } from 'zod';
import { MAX_HAZARD_MASK } from './hazards';

export const OFFICER_POSITIONS = ['kasi_trantibumlinmas', 'babinsa', 'bhabinkamtibmas', 'linmas', 'relawan', 'lainnya'] as const;
export type OfficerPosition = (typeof OFFICER_POSITIONS)[number];
export const EMPLOYMENT_STATUSES = ['pns', 'tni', 'polri', 'satlinmas', 'kontrak', 'non_aparatur'] as const;
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];
export const POST_TYPES = ['posko', 'pos_lapangan'] as const;

export const POSITION_LABEL: Record<OfficerPosition, string> = {
  kasi_trantibumlinmas: 'Kasi Trantibumlinmas kelurahan',
  babinsa: 'Babinsa',
  bhabinkamtibmas: 'Bhabinkamtibmas',
  linmas: 'Linmas (Satpol PP)',
  relawan: 'Relawan kebencanaan',
  lainnya: 'Lainnya',
};

export const EMPLOYMENT_LABEL: Record<EmploymentStatus, string> = {
  pns: 'PNS',
  tni: 'TNI',
  polri: 'POLRI',
  satlinmas: 'Satlinmas',
  kontrak: 'Tenaga kontrak',
  non_aparatur: 'Non-aparatur',
};

/** Jabatan → status kepegawaian (R12, terkonfirmasi BPBD 2026-11-15). `lainnya` bebas. */
export const POSITION_STATUS: Partial<Record<OfficerPosition, EmploymentStatus>> = {
  kasi_trantibumlinmas: 'pns',
  babinsa: 'tni',
  bhabinkamtibmas: 'polri',
  linmas: 'satlinmas',
  relawan: 'non_aparatur',
};

/** Status → jabatan bawaan saat impor tanpa kolom jabatan. */
export const STATUS_DEFAULT_POSITION: Record<EmploymentStatus, OfficerPosition> = {
  pns: 'lainnya',
  tni: 'babinsa',
  polri: 'bhabinkamtibmas',
  satlinmas: 'linmas',
  kontrak: 'lainnya',
  non_aparatur: 'lainnya',
};

export function resolveEmploymentStatus(position: OfficerPosition, requested?: EmploymentStatus | null): EmploymentStatus | null {
  return POSITION_STATUS[position] ?? requested ?? null;
}

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal YYYY-MM-DD');
const id16 = z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().length(16, 'Harus 16 digit'));

const officerFields = {
  position: z.enum(OFFICER_POSITIONS),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).nullish(),
  dutyKelurahanId: uuid.nullish(),
  certifications: z.string().trim().max(1000).nullish(),
  isTrcKlb: z.boolean().default(false),
  isTrcPdb: z.boolean().default(false),
  isPpe: z.boolean().default(false),
  isOps: z.boolean().default(true),
  postType: z.enum(POST_TYPES).nullish(),
  postKelurahanId: uuid.nullish(),
  hazardMask: z.number().int().min(0).max(MAX_HAZARD_MASK).optional(),
  note: z.string().trim().max(500).nullish(),
};

function refineOfficer(v: { position?: OfficerPosition; employmentStatus?: EmploymentStatus | null; dutyKelurahanId?: string | null }, ctx: z.RefinementCtx) {
  if (v.position && v.position !== 'lainnya' && !v.dutyKelurahanId) {
    ctx.addIssue({ code: 'custom', path: ['dutyKelurahanId'], message: 'Kelurahan wilayah tugas wajib diisi' });
  }
  if (v.position === 'lainnya' && !v.employmentStatus) {
    ctx.addIssue({ code: 'custom', path: ['employmentStatus'], message: 'Pilih status kepegawaian untuk jabatan lainnya' });
  }
}

export const createOfficerSchema = z
  .object({
    ...officerFields,
    fullName: z.string().trim().min(1, 'Nama wajib diisi').max(200),
    gender: z.enum(['L', 'P'], { message: 'Pilih L atau P' }),
    birthPlace: z.string().trim().max(100).nullish(),
    birthDate: isoDate.nullish(),
    nik: id16.nullish(),
    noNikReason: z.string().trim().max(300).nullish(),
  })
  .superRefine((v, ctx) => {
    refineOfficer(v, ctx);
    if (!v.nik && !v.noNikReason?.trim()) ctx.addIssue({ code: 'custom', path: ['noNikReason'], message: 'Isi NIK atau alasan NIK belum ada' });
  });
export type CreateOfficerRequest = z.infer<typeof createOfficerSchema>;

export const updateOfficerSchema = z.object(officerFields).partial().superRefine(refineOfficer);
export type UpdateOfficerRequest = z.infer<typeof updateOfficerSchema>;

export const fromVolunteerSchema = z.object(officerFields).partial().extend({ position: z.enum(OFFICER_POSITIONS).default('relawan') }).superRefine(refineOfficer);
export type FromVolunteerRequest = z.infer<typeof fromVolunteerSchema>;

export interface OfficerDto {
  id: string;
  personId: string;
  volunteerId: string | null;
  fullName: string;
  gender: 'L' | 'P';
  nikMasked: string | null;
  position: OfficerPosition;
  employmentStatus: EmploymentStatus;
  dutyKelurahanId: string | null;
  dutyKelurahanName: string | null;
  certifications: string | null;
  isTrcKlb: boolean;
  isTrcPdb: boolean;
  isPpe: boolean;
  isOps: boolean;
  postType: (typeof POST_TYPES)[number] | null;
  postKelurahanId: string | null;
  hazardMask: number;
  note: string | null;
  isResident: boolean;
}
