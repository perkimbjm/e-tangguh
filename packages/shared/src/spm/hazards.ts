/**
 * Sepuluh jenis bencana Form 5.A. Bit menentukan posisi dalam `hazard_mask`; urutan sama dengan
 * urutan kolom formulir. Nilai ini juga di-seed ke tabel `hazard_types`.
 */
export const HAZARDS = [
  { code: 'gempa', name: 'Gempa bumi', bit: 0 },
  { code: 'tsunami', name: 'Tsunami', bit: 1 },
  { code: 'banjir', name: 'Banjir', bit: 2 },
  { code: 'longsor', name: 'Tanah longsor', bit: 3 },
  { code: 'gunung_api', name: 'Letusan gunung api', bit: 4 },
  { code: 'gelombang_ekstrim', name: 'Gelombang ekstrem dan abrasi', bit: 5 },
  { code: 'angin_topan', name: 'Cuaca ekstrem (angin topan)', bit: 6 },
  { code: 'kekeringan', name: 'Kekeringan', bit: 7 },
  { code: 'karhutla', name: 'Kebakaran hutan dan lahan', bit: 8 },
  { code: 'epidemi', name: 'Epidemi dan wabah penyakit', bit: 9 },
] as const;

export type HazardCode = (typeof HAZARDS)[number]['code'];
export const HAZARD_CODES = HAZARDS.map((h) => h.code) as unknown as readonly [HazardCode, ...HazardCode[]];
export const MAX_HAZARD_MASK = (1 << HAZARDS.length) - 1;

const BY_CODE = new Map<string, (typeof HAZARDS)[number]>(HAZARDS.map((h) => [h.code, h]));

export function isHazardCode(value: string): value is HazardCode {
  return BY_CODE.has(value);
}

export function toMask(codes: Iterable<HazardCode>): number {
  let mask = 0;
  for (const code of codes) {
    const h = BY_CODE.get(code);
    if (!h) throw new Error(`Jenis bencana tidak dikenal: ${code}`);
    mask |= 1 << h.bit;
  }
  return mask;
}

export function fromMask(mask: number): HazardCode[] {
  if (!Number.isInteger(mask) || mask < 0 || mask > MAX_HAZARD_MASK) {
    throw new Error(`hazard_mask tidak sah: ${mask}`);
  }
  return HAZARDS.filter((h) => (mask & (1 << h.bit)) !== 0).map((h) => h.code);
}

export function hasHazard(mask: number, code: HazardCode): boolean {
  return (mask & (1 << BY_CODE.get(code)!.bit)) !== 0;
}

/** Label variasi kerawanan, mis. "Banjir, Cuaca ekstrem (angin topan)". */
export function variationLabel(mask: number): string {
  const names = fromMask(mask).map((c) => BY_CODE.get(c)!.name);
  return names.length ? names.join(', ') : '-';
}

/** Nomor variasi (1, 2, …) per bitmask berbeda, diurutkan menurut nilai bitmask (R6). */
export function variationNumbers(masks: Iterable<number>): Map<number, number> {
  const distinct = [...new Set(masks)].filter((m) => m > 0).sort((a, b) => a - b);
  return new Map(distinct.map((m, i) => [m, i + 1]));
}
