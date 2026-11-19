import type { FieldCipher } from '../../../crypto/field-cipher';

/** Kolom berisi data sensitif pada tabel antara impor; disimpan terenkripsi lalu dihapus. */
export const SENSITIVE_IMPORT_KEYS = ['nik', 'kk', 'address', 'specialNeeds', 'noNikReason'] as const;
const PREFIX = 'enc:';

export function sealRow(cipher: FieldCipher, row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const k of SENSITIVE_IMPORT_KEYS) {
    const v = out[k];
    if (v === null || v === undefined || v === '') continue;
    const text = v instanceof Date ? v.toISOString() : String(v);
    out[k] = PREFIX + cipher.encrypt(text).toString('base64');
  }
  return out;
}

export function unsealRow<T extends Record<string, unknown>>(cipher: FieldCipher, row: T): T {
  const out: Record<string, unknown> = { ...row };
  for (const k of SENSITIVE_IMPORT_KEYS) {
    const v = out[k];
    if (typeof v === 'string' && v.startsWith(PREFIX)) out[k] = cipher.decrypt(Buffer.from(v.slice(PREFIX.length), 'base64'));
  }
  return out as T;
}

/** Nilai Date dari lembar kerja disimpan sebagai teks ISO agar dapat diurai ulang. */
export function jsonSafe(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[k] = v instanceof Date ? v.toISOString().slice(0, 10) : v;
  return out;
}
