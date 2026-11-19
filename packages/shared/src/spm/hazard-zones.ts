import { z } from 'zod';
import { MAX_HAZARD_MASK } from './hazards';

const rtRw = z.string().trim().regex(/^\d{1,3}$/, 'Isi angka').transform((v) => String(Number(v)));

export const HAZARD_ZONE_BASES = ['krb', 'keputusan_bpbd'] as const;

export const hazardZoneSchema = z.object({
  kelurahanId: z.string().uuid(),
  rw: rtRw,
  rt: rtRw.nullish(),
  hazardMask: z.number().int().min(1, 'Pilih minimal satu jenis bencana').max(MAX_HAZARD_MASK),
  basis: z.enum(HAZARD_ZONE_BASES),
  basisRef: z.string().trim().min(1, 'Isi nomor/judul dokumen dasar penetapan').max(300),
});
export type HazardZoneRequest = z.infer<typeof hazardZoneSchema>;

export const updateHazardZoneSchema = hazardZoneSchema.partial();
export type UpdateHazardZoneRequest = z.infer<typeof updateHazardZoneSchema>;

export interface HazardZoneDto {
  id: string;
  kelurahanId: string;
  kelurahanName: string;
  rw: string;
  rt: string | null;
  hazardMask: number;
  basis: (typeof HAZARD_ZONE_BASES)[number];
  basisRef: string;
}
