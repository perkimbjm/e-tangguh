/** Pengurai nilai sel lembar kerja menjadi bentuk baku (contracts/import.md, normalisasi). */

export type CellValue = string | number | boolean | Date | null | undefined;

export function cellText(value: CellValue): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).replace(/\s+/g, ' ').trim();
}

const lower = (v: CellValue) => cellText(v).toLowerCase();

export function parseGender(value: CellValue): 'L' | 'P' | null {
  const v = lower(value).replace(/[\s-]/g, '');
  if (v === 'l' || v === 'lakilaki' || v === 'pria') return 'L';
  if (v === 'p' || v === 'perempuan' || v === 'wanita') return 'P';
  return null;
}

/** `miskin` → true, `tidak miskin` → false, kosong → false, lainnya → null. */
export function parseEconomy(value: CellValue): boolean | null {
  const v = lower(value).replace(/\s+/g, ' ');
  if (v === 'miskin') return true;
  if (v === 'tidak miskin' || v === 'tdk miskin' || v === '') return false;
  return null;
}

/** `ya` → true, `tidak` → false, kosong → false, lainnya → null. */
export function parseYesNo(value: CellValue): boolean | null {
  const v = lower(value);
  if (v === 'ya' || v === 'y') return true;
  if (v === 'tidak' || v === 't' || v === 'tdk' || v === '') return false;
  return null;
}

const CHECK_TRUE = new Set(['v', 'x', '✓', '✔', '√', '1', 'ya', 'y', 'true']);

/** Kolom centang: `v`, `x`, `✓`, `1`, `ya` → true; kosong → false; lainnya → null. */
export function parseCheck(value: CellValue): boolean | null {
  if (value === true) return true;
  if (value === false) return false;
  const v = lower(value);
  if (v === '' || v === '0' || v === '-' || v === 'tidak') return false;
  return CHECK_TRUE.has(v) ? true : null;
}

function isoDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Tanggal Excel (Date atau nomor seri) atau teks `dd/mm/yyyy` / `yyyy-mm-dd` → `YYYY-MM-DD`. */
export function parseDate(value: CellValue): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : isoDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  if (typeof value === 'number') {
    if (value < 1 || value > 80000) return null;
    const ms = Math.round((value - 25569) * 86400000);
    const dt = new Date(ms);
    return isoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
  }
  const v = cellText(value);
  let m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (m) return isoDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return isoDate(Number(m[1]), Number(m[2]), Number(m[3]));
  return null;
}

/** Nomor RT/RW baku: angka tanpa nol di depan, mis. "005" → "5". */
export function normalizeRtRw(value: CellValue): string | null {
  const digits = cellText(value).replace(/\D/g, '');
  if (!digits) return null;
  const n = String(Number(digits));
  return n === '0' ? null : n;
}

/** Mengurai RT dan RW dari teks alamat, mis. "Jl. Melati RT 05 RW 02" atau "RT.005/RW.002". */
export function parseRtRwFromAddress(address: string): { rt: string | null; rw: string | null } {
  const rt = /\bRT\.?\s*:?\s*0*(\d{1,3})\b/i.exec(address);
  const rw = /\bRW\.?\s*:?\s*0*(\d{1,3})\b/i.exec(address);
  return { rt: rt ? normalizeRtRw(rt[1]) : null, rw: rw ? normalizeRtRw(rw[1]) : null };
}
