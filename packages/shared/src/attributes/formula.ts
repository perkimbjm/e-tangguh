/**
 * Rumus atribut kartu kompetensi dan kesiapan, versi rumus 1
 * (specs/001-basis-data-relawan/contracts/attribute-formula.md). Fungsi murni dan deterministik.
 * Ambang dan bobot adalah USULAN AWAL dan WAJIB disetujui BPBD sebelum dipakai resmi.
 * DILARANG menerima jenis kelamin, usia, agama, suku, disabilitas, kesehatan, organisasi, atau wilayah.
 */
export const ATTRIBUTE_CODES = ['kmp', 'lat', 'png', 'sia', 'sen', 'kep'] as const;
export type AttributeCode = (typeof ATTRIBUTE_CODES)[number];

export const ATTRIBUTE_LABEL: Record<AttributeCode, { code: string; name: string; source: string }> = {
  kmp: { code: 'KMP', name: 'Kompetensi', source: 'Sertifikat aktif' },
  lat: { code: 'LAT', name: 'Pelatihan', source: 'Jam pelatihan 5 tahun terakhir' },
  png: { code: 'PNG', name: 'Pengalaman', source: 'Hari penugasan' },
  sia: { code: 'SIA', name: 'Kesiapan', source: 'Status ketersediaan dan kesegaran data' },
  sen: { code: 'SEN', name: 'Masa bakti', source: 'Tahun aktif' },
  kep: { code: 'KEP', name: 'Kepemimpinan', source: 'Penugasan koordinator dan peran pengurus' },
};

export const FORMULA_VERSION_1 = {
  version: 1,
  approved: false,
  max: { kmpPoints: 10, latHours: 120, pngDays: 60, senYears: 10, kepPoints: 10 },
  certificatePoints: { dasar: 1, lanjutan: 2, ahli: 3 },
  availability: { siaga: 70, terbatas: 40, tidak_tersedia: 1 },
  freshness: { days180: 29, days365: 15 },
  weights: { kmp: 0.25, lat: 0.15, png: 0.25, sia: 0.15, sen: 0.1, kep: 0.1 },
} as const;
export type FormulaWeights = typeof FORMULA_VERSION_1;

export type CertificateLevel = 'dasar' | 'lanjutan' | 'ahli';
export type Availability = 'siaga' | 'terbatas' | 'tidak_tersedia';

export interface EvidenceItem {
  id: string;
  label: string;
}

/** Masukan hanya bukti terverifikasi yang belum kedaluwarsa pada `today`. */
export interface AttributeInput {
  certificates: (EvidenceItem & { level: CertificateLevel; expiresAt?: string | null })[];
  trainings: (EvidenceItem & { hours: number; date: string })[];
  deployments: (EvidenceItem & { days: number; coordinator?: boolean })[];
  availability: Availability | null;
  lastUpdatedAt: string | null;
  joinedAt: string | null;
  activeOfficerRoles: number;
}

export interface AttributeBreakdownItem {
  id: string;
  label: string;
  contribution: number;
}

export interface AttributeResult {
  version: number;
  approved: boolean;
  values: Record<AttributeCode, number>;
  overall: number;
  breakdown: Record<AttributeCode, AttributeBreakdownItem[]>;
}

export function scale(x: number, max: number): number {
  return Math.min(99, Math.max(1, Math.round(1 + (98 * Math.min(Math.max(x, 0), max)) / max)));
}

const DAY = 86_400_000;
const daysBetween = (a: string, b: string) => Math.floor((Date.parse(b) - Date.parse(a)) / DAY);

export function computeAttributes(input: AttributeInput, w: FormulaWeights = FORMULA_VERSION_1, today: string = new Date().toISOString().slice(0, 10)): AttributeResult {
  const breakdown: AttributeResult['breakdown'] = { kmp: [], lat: [], png: [], sia: [], sen: [], kep: [] };

  const certs = input.certificates.filter((c) => !c.expiresAt || c.expiresAt >= today);
  let kmpPoints = 0;
  for (const c of certs) {
    const p = w.certificatePoints[c.level];
    kmpPoints += p;
    breakdown.kmp.push({ id: c.id, label: c.label, contribution: p });
  }

  const fiveYearsAgo = `${Number(today.slice(0, 4)) - 5}${today.slice(4)}`;
  let hours = 0;
  for (const t of input.trainings.filter((t) => t.date >= fiveYearsAgo && t.date <= today)) {
    hours += t.hours;
    breakdown.lat.push({ id: t.id, label: t.label, contribution: t.hours });
  }

  let days = 0;
  let kepPoints = 0;
  for (const d of input.deployments) {
    days += d.days;
    breakdown.png.push({ id: d.id, label: d.label, contribution: d.days });
    if (d.coordinator) {
      kepPoints += 2;
      breakdown.kep.push({ id: d.id, label: `Koordinator: ${d.label}`, contribution: 2 });
    }
  }
  if (input.activeOfficerRoles > 0) {
    kepPoints += 2 * input.activeOfficerRoles;
    breakdown.kep.push({ id: 'pengurus', label: 'Peran pengurus aktif', contribution: 2 * input.activeOfficerRoles });
  }

  let sia: number = input.availability ? w.availability[input.availability] : 1;
  if (input.availability) breakdown.sia.push({ id: 'ketersediaan', label: `Status ${input.availability.replace('_', ' ')}`, contribution: sia });
  if (input.availability && input.lastUpdatedAt) {
    const age = daysBetween(input.lastUpdatedAt.slice(0, 10), today);
    const bonus = age <= 180 ? w.freshness.days180 : age <= 365 ? w.freshness.days365 : 0;
    if (bonus) {
      sia += bonus;
      breakdown.sia.push({ id: 'kesegaran', label: `Data diperbarui ${age} hari lalu`, contribution: bonus });
    }
  }
  sia = Math.min(99, Math.max(1, sia));

  let years = 0;
  if (input.joinedAt && input.joinedAt <= today) {
    years = Math.floor(daysBetween(input.joinedAt, today) / 365.25);
    breakdown.sen.push({ id: 'masa-bakti', label: `Aktif sejak ${input.joinedAt.slice(0, 4)}`, contribution: years });
  }

  const values: AttributeResult['values'] = {
    kmp: scale(kmpPoints, w.max.kmpPoints),
    lat: scale(hours, w.max.latHours),
    png: scale(days, w.max.pngDays),
    sia,
    sen: scale(years, w.max.senYears),
    kep: scale(kepPoints, w.max.kepPoints),
  };
  const overall = Math.round(ATTRIBUTE_CODES.reduce((a, k) => a + w.weights[k] * values[k], 0));
  return { version: w.version, approved: w.approved, values, overall, breakdown };
}
