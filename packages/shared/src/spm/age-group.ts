export const AGE_GROUPS = ['balita', 'anak', 'dewasa', 'lansia'] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

/** Batas kelompok umur dalam tahun penuh: balita < balitaMax, anak < anakMax, lansia ≥ lansiaMin. */
export interface AgeBands {
  balitaMax: number;
  anakMax: number;
  lansiaMin: number;
}

export const DEFAULT_AGE_BANDS: AgeBands = { balitaMax: 5, anakMax: 18, lansiaMin: 60 };

/** Kelompok umur rentan pada Form 5.A.1 = selain dewasa. */
export function isVulnerableAge(group: AgeGroup): boolean {
  return group !== 'dewasa';
}

function parseDate(value: string | Date): { y: number; m: number; d: number } {
  if (value instanceof Date) return { y: value.getUTCFullYear(), m: value.getUTCMonth() + 1, d: value.getUTCDate() };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Tanggal tidak sah: ${value}`);
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

/** Umur dalam tahun penuh pada tanggal acuan (ulang tahun 29 Februari dihitung 1 Maret). */
export function ageInYears(birthDate: string | Date, referenceDate: string | Date): number {
  const b = parseDate(birthDate);
  const r = parseDate(referenceDate);
  let age = r.y - b.y;
  if (r.m < b.m || (r.m === b.m && r.d < b.d)) age -= 1;
  return age;
}

export function ageGroup(birthDate: string | Date, referenceDate: string | Date, bands: AgeBands = DEFAULT_AGE_BANDS): AgeGroup {
  const age = ageInYears(birthDate, referenceDate);
  if (age < 0) throw new Error('Tanggal lahir setelah tanggal acuan');
  if (age < bands.balitaMax) return 'balita';
  if (age < bands.anakMax) return 'anak';
  if (age >= bands.lansiaMin) return 'lansia';
  return 'dewasa';
}

export function validateAgeBands(b: AgeBands): string | null {
  if (!(b.balitaMax > 0 && b.balitaMax < b.anakMax && b.anakMax <= b.lansiaMin && b.lansiaMin < 120)) {
    return 'Batas kelompok umur harus berurutan: 0 < balita < anak ≤ lansia < 120';
  }
  return null;
}
