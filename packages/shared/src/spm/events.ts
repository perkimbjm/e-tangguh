import { z } from 'zod';
import type { EmergencyStatus } from './emergency-status';
import { HAZARD_CODES, type HazardCode } from './hazards';
import { POST_TYPES } from './officers';

export const AFFECTED_STATUSES = ['meninggal', 'hilang', 'medis_darurat', 'medis_lanjut', 'selamat'] as const;
export type AffectedStatus = (typeof AFFECTED_STATUSES)[number];
export const AFFECTED_LABEL: Record<AffectedStatus, string> = {
  meninggal: 'Meninggal',
  hilang: 'Hilang',
  medis_darurat: 'Butuh bantuan medis darurat',
  medis_lanjut: 'Butuh bantuan medis lanjut',
  selamat: 'Selamat',
};

const uuid = z.string().uuid();
const dateTime = z.string().datetime({ offset: true, message: 'Format waktu ISO 8601 dengan zona waktu' });
const id16 = z.string().transform((v) => v.replace(/\D/g, '')).pipe(z.string().length(16, 'Harus 16 digit'));

const eventBase = z.object({
  name: z.string().trim().min(3, 'Nama kejadian wajib diisi').max(200),
  hazardCode: z.enum(HAZARD_CODES),
  occurredAt: dateTime,
  reportedAt: dateTime,
  locationText: z.string().trim().min(2, 'Lokasi wajib diisi').max(300),
  kelurahanId: uuid.nullish(),
  /** Titik lokasi opsional, EPSG:4326. */
  lon: z.number().min(-180).max(180).nullish(),
  lat: z.number().min(-90).max(90).nullish(),
  emergencyDeclaredAt: dateTime.nullish(),
});

function refineEvent(v: Partial<z.infer<typeof eventBase>>, ctx: z.RefinementCtx) {
  if (v.occurredAt && v.reportedAt && new Date(v.reportedAt) < new Date(v.occurredAt)) {
    ctx.addIssue({ code: 'custom', path: ['reportedAt'], message: 'Waktu laporan tidak boleh sebelum waktu kejadian' });
  }
  if ((v.lon === undefined || v.lon === null) !== (v.lat === undefined || v.lat === null)) {
    ctx.addIssue({ code: 'custom', path: ['lat'], message: 'Isi lintang dan bujur sekaligus' });
  }
}

export const createEventSchema = eventBase.superRefine(refineEvent);
export type CreateEventRequest = z.infer<typeof eventBase>;
export const updateEventSchema = eventBase.partial().superRefine(refineEvent);
export type UpdateEventRequest = z.infer<typeof updateEventSchema>;

export const addAffectedSchema = z
  .object({
    personId: uuid.optional(),
    nik: id16.nullish(),
    noNikReason: z.string().trim().max(300).nullish(),
    fullName: z.string().trim().min(1).max(200).optional(),
    gender: z.enum(['L', 'P']).optional(),
    birthPlace: z.string().trim().max(100).nullish(),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
    status: z.enum(AFFECTED_STATUSES),
    isDisplaced: z.boolean().default(false),
    note: z.string().trim().max(500).nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.personId) return;
    if (!v.fullName) ctx.addIssue({ code: 'custom', path: ['fullName'], message: 'Nama wajib diisi untuk korban baru' });
    if (!v.gender) ctx.addIssue({ code: 'custom', path: ['gender'], message: 'Pilih jenis kelamin' });
    if (!v.nik && !v.noNikReason?.trim()) ctx.addIssue({ code: 'custom', path: ['noNikReason'], message: 'Isi NIK atau alasan NIK belum ada' });
  });
export type AddAffectedRequest = z.infer<typeof addAffectedSchema>;

export const updateAffectedSchema = z.object({
  status: z.enum(AFFECTED_STATUSES).optional(),
  isDisplaced: z.boolean().optional(),
  note: z.string().trim().max(500).nullish(),
});
export type UpdateAffectedRequest = z.infer<typeof updateAffectedSchema>;

export const eventOfficerSchema = z.object({
  isTrcKlb: z.boolean().default(false),
  isTrcPdb: z.boolean().default(false),
  isPpe: z.boolean().default(false),
  isOps: z.boolean().default(true),
  postType: z.enum(POST_TYPES).nullish(),
  postKecamatanId: uuid.nullish(),
  postKelurahanId: uuid.nullish(),
});
export type EventOfficerRequest = z.infer<typeof eventOfficerSchema>;

export interface EventDto {
  id: string;
  name: string;
  hazardCode: HazardCode;
  occurredAt: string;
  reportedAt: string;
  locationText: string;
  kelurahanId: string | null;
  kelurahanName: string | null;
  lon: number | null;
  lat: number | null;
  emergencyDeclaredAt: string | null;
  emergencyStatus: EmergencyStatus;
  affectedCount: number;
  officerCount: number;
}

export interface AffectedDto {
  personId: string;
  fullName: string;
  gender: 'L' | 'P';
  nikMasked: string | null;
  status: AffectedStatus;
  isDisplaced: boolean;
  statusUpdatedAt: string;
  isResident: boolean;
  history: { status: AffectedStatus; changedAt: string; note: string | null }[];
}

export interface EventOfficerDto {
  officerId: string;
  fullName: string;
  position: string;
  isTrcKlb: boolean;
  isTrcPdb: boolean;
  isPpe: boolean;
  isOps: boolean;
  postType: (typeof POST_TYPES)[number] | null;
  postKecamatanId: string | null;
  postKelurahanId: string | null;
}
