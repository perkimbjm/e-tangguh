import { z } from 'zod';

/** Pengaturan kartu yang diisi BPBD; sistem tidak mengarang nomor telepon, alamat, atau pejabat. */
export const idCardSettingsSchema = z.object({
  agencyName: z.string().trim().min(3).max(120).default('BPBD Kota Banjarmasin'),
  hotline: z.string().trim().max(40).nullish(),
  address: z.string().trim().max(200).nullish(),
  signatoryTitle: z.string().trim().max(120).nullish(),
  signatoryName: z.string().trim().max(120).nullish(),
});
export type IdCardSettings = z.infer<typeof idCardSettingsSchema>;
export const DEFAULT_ID_CARD_SETTINGS: IdCardSettings = { agencyName: 'BPBD Kota Banjarmasin', hotline: null, address: null, signatoryTitle: null, signatoryName: null };

/**
 * Pembingkaian foto pada kartu: titik fokus (persen) dan perbesaran.
 * Memungkinkan foto close-up maupun separuh badan tanpa memotong berkas aslinya.
 */
export const photoFrameSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  zoom: z.number().min(1).max(2.5),
});
export type PhotoFrame = z.infer<typeof photoFrameSchema>;
export const DEFAULT_PHOTO_FRAME: PhotoFrame = { x: 50, y: 30, zoom: 1 };

/** Kategori kartu: relawan (jabatan relawan) atau petugas/aparatur (lainnya). */
export type IdCardCategory = 'relawan' | 'petugas';

export interface IdCardDto {
  officerId: string;
  category: IdCardCategory;
  fullName: string;
  initials: string;
  positionLabel: string;
  employmentLabel: string;
  dutyKelurahanName: string | null;
  duties: string[];
  hazards: string[];
  certifications: string[];
  year: number;
  validUntil: string;
  cardCode: string;
  cardNumber: string;
  issuedAt: string;
  hasPhoto: boolean;
  photoFrame: PhotoFrame;
  settings: IdCardSettings;
}

export interface IdCardVerification {
  valid: boolean;
  status: 'berlaku' | 'kedaluwarsa';
  category: IdCardCategory;
  fullName: string;
  positionLabel: string;
  dutyKelurahanName: string | null;
  year: number;
  validUntil: string;
  cardNumber: string;
  agencyName: string;
}

/** Nomor kartu tampilan dari kode verifikasi, mis. "ETG-2027-K7M2-QX9P". */
export function formatCardNumber(year: number, code: string): string {
  return `ETG-${year}-${code.slice(0, 4)}-${code.slice(4, 8)}`;
}
