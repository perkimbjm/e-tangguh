import type { Measure, ResidentFilter } from '@etangguh/shared';
import { type SQL, and, eq, sql } from 'drizzle-orm';
import { hazardZones, officerRecords, residentRecords } from '../../../db/schema';

/**
 * Menerjemahkan `ResidentFilter` menjadi klausa SQL. Klausa yang sama dipakai untuk angka agregat
 * (`FILTER (WHERE …)`) dan untuk penelusuran baris, sehingga keduanya tidak dapat menyimpang.
 */
export function compileResidentFilter(f: ResidentFilter): SQL {
  const parts: SQL[] = [];
  if (f.kelurahanId !== undefined) parts.push(sql`${residentRecords.kelurahanId} = ${f.kelurahanId}`);
  if (f.hazardMask !== undefined) parts.push(sql`${residentRecords.hazardMask} = ${f.hazardMask}`);
  if (f.hazardBit !== undefined) parts.push(sql`(${residentRecords.hazardMask} & ${1 << f.hazardBit}) <> 0`);
  if (f.isPoor !== undefined) parts.push(sql`${residentRecords.isPoor} = ${f.isPoor}`);
  if (f.hasSpecialNeeds !== undefined) parts.push(sql`${residentRecords.hasSpecialNeeds} = ${f.hasSpecialNeeds}`);
  if (f.isFamilyHead !== undefined) parts.push(sql`${residentRecords.isFamilyHead} = ${f.isFamilyHead}`);
  if (f.vulnerableAge !== undefined) parts.push(f.vulnerableAge ? sql`${residentRecords.ageGroup} <> 'dewasa'` : sql`${residentRecords.ageGroup} = 'dewasa'`);
  return parts.length ? sql.join(parts, sql` AND `) : sql`TRUE`;
}

export function compileZoneFilter(f: ResidentFilter): SQL {
  const parts: SQL[] = [];
  if (f.kelurahanId !== undefined) parts.push(sql`${hazardZones.kelurahanId} = ${f.kelurahanId}`);
  if (f.hazardBit !== undefined) parts.push(sql`(${hazardZones.hazardMask} & ${1 << f.hazardBit}) <> 0`);
  if (f.hazardMask !== undefined) parts.push(sql`${hazardZones.hazardMask} = ${f.hazardMask}`);
  return parts.length ? sql.join(parts, sql` AND `) : sql`TRUE`;
}

/** Filter petugas: kelurahan = kelurahan wilayah tugas; bit = jenis bencana yang ditangani. */
export function compileOfficerFilter(f: ResidentFilter): SQL {
  const o = officerRecords;
  const parts: SQL[] = [];
  if (f.kelurahanId !== undefined) parts.push(sql`${o.dutyKelurahanId} = ${f.kelurahanId}`);
  if (f.hazardBit !== undefined) parts.push(sql`(${o.hazardMask} & ${1 << f.hazardBit}) <> 0`);
  if (f.employmentStatus !== undefined) parts.push(sql`${o.employmentStatus} = ${f.employmentStatus}`);
  if (f.position !== undefined) parts.push(sql`${o.position} = ${f.position}`);
  if (f.isTrcPdb !== undefined) parts.push(sql`${o.isTrcPdb} = ${f.isTrcPdb}`);
  if (f.isTrcKlb !== undefined) parts.push(sql`${o.isTrcKlb} = ${f.isTrcKlb}`);
  if (f.isPpe !== undefined) parts.push(sql`${o.isPpe} = ${f.isPpe}`);
  if (f.isOps !== undefined) parts.push(sql`${o.isOps} = ${f.isOps}`);
  if (f.anyDuty) parts.push(sql`(${o.isTrcPdb} OR ${o.isTrcKlb} OR ${o.isPpe} OR ${o.isOps})`);
  return parts.length ? sql.join(parts, sql` AND `) : sql`TRUE`;
}

export function officerBase(fiscalYearId: string, scopeKelurahanId: string | null): SQL {
  return and(eq(officerRecords.fiscalYearId, fiscalYearId), scopeKelurahanId ? eq(officerRecords.dutyKelurahanId, scopeKelurahanId) : undefined)!;
}

/** Hanya baris disetujui dan aktif yang masuk rekap (contracts/forms.md). */
export function residentBase(fiscalYearId: string, scopeKelurahanId: string | null): SQL {
  return and(
    eq(residentRecords.fiscalYearId, fiscalYearId),
    eq(residentRecords.approvalStatus, 'disetujui'),
    eq(residentRecords.isActive, true),
    scopeKelurahanId ? eq(residentRecords.kelurahanId, scopeKelurahanId) : undefined,
  )!;
}

export function zoneBase(fiscalYearId: string, scopeKelurahanId: string | null): SQL {
  return and(eq(hazardZones.fiscalYearId, fiscalYearId), scopeKelurahanId ? eq(hazardZones.kelurahanId, scopeKelurahanId) : undefined)!;
}

/** Ekspresi agregat untuk satu ukuran dengan filter. */
export function measureExpr(measure: Measure, filter: SQL): SQL<number> {
  switch (measure) {
    case 'persons':
      return sql<number>`count(*) FILTER (WHERE ${filter})`;
    case 'families':
      return sql<number>`count(DISTINCT ${residentRecords.familyId}) FILTER (WHERE ${filter})`;
    case 'zoneKelurahan':
      return sql<number>`count(DISTINCT ${hazardZones.kelurahanId}) FILTER (WHERE ${filter})`;
    case 'officers':
      return sql<number>`count(*) FILTER (WHERE ${filter})`;
  }
}

/** Tanda tangan filter tanpa kelurahan, untuk mengelompokkan sel sekolom dalam satu ekspresi. */
export function filterSignature(measure: Measure, f: ResidentFilter): string {
  const { kelurahanId: _k, ...rest } = f;
  return `${measure}|${JSON.stringify(Object.keys(rest).sort().map((k) => [k, rest[k as keyof typeof rest]]))}`;
}
