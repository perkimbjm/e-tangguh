export const EMERGENCY_STATUSES = ['tidak_dikeluarkan', 'kurang_24_jam', 'lebih_24_jam'] as const;
export type EmergencyStatus = (typeof EMERGENCY_STATUSES)[number];

export const EMERGENCY_LABEL: Record<EmergencyStatus, string> = {
  tidak_dikeluarkan: 'Tidak dikeluarkan',
  kurang_24_jam: 'Dikeluarkan < 24 jam',
  lebih_24_jam: 'Dikeluarkan > 24 jam',
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Kategori status darurat Form 5.A.12 (R11): dari waktu laporan diterima dan waktu penetapan.
 * Tepat 24 jam termasuk "< 24 jam" (data-model.md: selisih ≤ 24 jam).
 */
export function emergencyStatus(reportedAt: Date | string, declaredAt: Date | string | null | undefined): EmergencyStatus {
  if (!declaredAt) return 'tidak_dikeluarkan';
  const diff = new Date(declaredAt).getTime() - new Date(reportedAt).getTime();
  return diff <= DAY_MS ? 'kurang_24_jam' : 'lebih_24_jam';
}
