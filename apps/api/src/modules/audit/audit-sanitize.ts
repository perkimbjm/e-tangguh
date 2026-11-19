/**
 * Token kunci yang DILARANG masuk `audit_log.detail` (NIK, KK, alamat, data kesehatan, kebutuhan
 * khusus, kontak darurat, kata sandi). Kunci dipecah menurut camelCase dan garis bawah, lalu
 * tiap token dicocokkan, sehingga `nikHash` dan `no_kk` tertolak tetapi `unique` tidak.
 */
const FORBIDDEN_TOKENS = new Set([
  'nik', 'kk', 'nokk', 'alamat', 'address', 'kesehatan', 'health', 'penyakit', 'disease',
  'blood', 'darah', 'disability', 'disabilitas', 'emergency', 'darurat', 'password', 'sandi',
  'token', 'secret',
]);
const FORBIDDEN_PAIRS = [['special', 'needs'], ['kebutuhan', 'khusus']];

function tokens(key: string): string[] {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Pola nilai: 16 digit berturut-turut (bentuk NIK/KK). */
const SIXTEEN_DIGITS = /\b\d{16}\b/;

export function isForbiddenKey(key: string): boolean {
  const t = tokens(key);
  if (t.some((x) => FORBIDDEN_TOKENS.has(x))) return true;
  return FORBIDDEN_PAIRS.some(([a, b]) => t.includes(a!) && t.includes(b!));
}

/** Membuang kunci terlarang dan menyamarkan nilai berbentuk NIK/KK, secara rekursif. */
export function sanitizeAuditDetail(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[terpotong]';
  if (typeof value === 'string') return SIXTEEN_DIGITS.test(value) ? '[disamarkan]' : value;
  if (Array.isArray(value)) return value.slice(0, 100).map((v) => sanitizeAuditDetail(v, depth + 1));
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (!isForbiddenKey(k)) out[k] = sanitizeAuditDetail(v, depth + 1);
    }
    return out;
  }
  return value;
}
