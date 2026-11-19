import { DEFAULT_AGE_BANDS } from '@etangguh/shared';
import { fiscalYears, hazardZones } from '../../src/db/schema';
import { seedHazardTypes, seedSampleRegions } from '../../src/db/seed/reference-data';
import type { TestApp } from './app';

export interface SpmYear {
  year: number;
  fyId: string;
  sungaiMiai: string;
  kuinUtara: string;
  pelambuan: string;
}

/** Tahun anggaran tersendiri per berkas uji agar data uji tidak saling bertumpuk. */
export async function setupSpmYear(t: TestApp, year: number): Promise<SpmYear> {
  await seedHazardTypes(t.db.root);
  const ids = await seedSampleRegions(t.db.root);
  const [fy] = await t.db.root
    .insert(fiscalYears)
    .values({ year, ageReferenceDate: `${year}-12-31`, ageBands: DEFAULT_AGE_BANDS })
    .returning({ id: fiscalYears.id });
  return { year, fyId: fy!.id, sungaiMiai: ids['CTH.01.001']!, kuinUtara: ids['CTH.01.002']!, pelambuan: ids['CTH.02.001']! };
}

export async function addZone(t: TestApp, fyId: string, kelurahanId: string, rw: string, rt: string | null = null, hazardMask = 4) {
  const [z] = await t.db.root
    .insert(hazardZones)
    .values({ fiscalYearId: fyId, kelurahanId, rw, rt, hazardMask, basis: 'keputusan_bpbd', basisRef: 'SK uji sintetis' })
    .returning();
  return z!;
}

export function residentBody(kelurahanId: string, overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'Warga Sintetis',
    gender: 'P',
    birthPlace: 'Banjarmasin',
    birthDate: '1990-05-01',
    nik: '9900000000009001',
    kk: '9800000000009001',
    isFamilyHead: true,
    kelurahanId,
    rw: '1',
    rt: '3',
    address: 'Jl. Sintetis No. 1',
    isPoor: true,
    hasSpecialNeeds: false,
    ...overrides,
  };
}
