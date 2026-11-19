import { HAZARDS } from '@etangguh/shared';
import { sql } from 'drizzle-orm';
import type { DbExecutor } from '../client';
import { hazardTypes, regions } from '../schema';

/**
 * Wilayah CONTOH untuk pengembangan. Kode berawalan `CTH.` sengaja bukan kode resmi; daftar dan
 * batas wilayah resmi WAJIB dimuat dari sumber yang dikonfirmasi BPBD/Diskominfo sebelum produksi.
 */
export const SAMPLE_REGIONS = {
  kecamatan: [
    { code: 'CTH.01', name: 'Banjarmasin Utara' },
    { code: 'CTH.02', name: 'Banjarmasin Barat' },
  ],
  kelurahan: [
    { code: 'CTH.01.001', name: 'Sungai Miai', parent: 'CTH.01' },
    { code: 'CTH.01.002', name: 'Kuin Utara', parent: 'CTH.01' },
    { code: 'CTH.02.001', name: 'Pelambuan', parent: 'CTH.02' },
  ],
} as const;

export const HAZARD_REGULATION_REF = 'Permendagri No. 101 Tahun 2018, Lampiran Form 5.A';

export async function seedHazardTypes(db: DbExecutor): Promise<void> {
  await db
    .insert(hazardTypes)
    .values(HAZARDS.map((h, i) => ({ code: h.code, name: h.name, bit: h.bit, formOrder: i + 1, regulationRef: HAZARD_REGULATION_REF })))
    .onConflictDoUpdate({
      target: hazardTypes.code,
      set: { name: sql`excluded.name`, bit: sql`excluded.bit`, formOrder: sql`excluded.form_order` },
    });
}

export async function seedSampleRegions(db: DbExecutor): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const k of SAMPLE_REGIONS.kecamatan) {
    const [row] = await db
      .insert(regions)
      .values({ code: k.code, name: k.name, level: 'kecamatan' })
      .onConflictDoUpdate({ target: regions.code, set: { name: k.name } })
      .returning({ id: regions.id });
    ids[k.code] = row!.id;
  }
  for (const k of SAMPLE_REGIONS.kelurahan) {
    const [row] = await db
      .insert(regions)
      .values({ code: k.code, name: k.name, level: 'kelurahan', parentId: ids[k.parent] })
      .onConflictDoUpdate({ target: regions.code, set: { name: k.name, parentId: ids[k.parent] } })
      .returning({ id: regions.id });
    ids[k.code] = row!.id;
  }
  return ids;
}
