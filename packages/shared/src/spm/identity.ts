/** Menghapus spasi dan tanda baca dari NIK/KK (contracts/import.md). */
export function normalizeIdNumber(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\D/g, '');
}

/** NIK dan nomor KK wajib tepat 16 digit. */
export function isSixteenDigits(value: string): boolean {
  return /^\d{16}$/.test(value);
}

/** Tampilan tersamar, mis. "************0001". */
export function maskIdNumber(last4: string | null | undefined): string | null {
  return last4 ? `************${last4}` : null;
}
