import { Injectable } from '@nestjs/common';
import {
  AFFECTED_STATUSES,
  type AffectedStatus,
  type DashboardDto,
  HAZARDS,
  type SessionUser,
} from '@etangguh/shared';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { KelurahanScope } from '../../../common/guards/kelurahan-scope';
import { DbService } from '../../../db/db.module';
import {
  affectedPersons,
  disasterEvents,
  hazardZones,
  officerRecords,
  persons,
  regions,
  residentRecords,
} from '../../../db/schema';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { residentBase } from '../recap/recap-query.builder';

const n = (v: unknown) => Number(v ?? 0);

/** Agregat dasbor Beranda; data petugas dan kejadian hanya untuk peran BPBD. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsService,
  ) {}

  async get(year: number, user: SessionUser): Promise<DashboardDto> {
    const fy = await this.years.get(year);
    const scope = KelurahanScope.resolve(user);
    const db = this.db.executor();
    const rr = residentRecords;
    const scoped = and(
      eq(rr.fiscalYearId, fy.id),
      eq(rr.isActive, true),
      scope ? eq(rr.kelurahanId, scope) : undefined,
    );

    const [totals] = await db
      .select({
        total: count(),
        approved: sql<number>`count(*) filter (where ${rr.approvalStatus} = 'disetujui')`,
        pending: sql<number>`count(*) filter (where ${rr.approvalStatus} = 'menunggu')`,
        returned: sql<number>`count(*) filter (where ${rr.approvalStatus} = 'dikembalikan')`,
        withoutNik: sql<number>`count(*) filter (where ${persons.nikHash} is null)`,
      })
      .from(rr)
      .innerJoin(persons, eq(persons.id, rr.personId))
      .where(scoped);

    const approvedWhere = residentBase(fy.id, scope);
    const [approved] = await db
      .select({
        families: sql<number>`count(distinct ${rr.familyId})`,
        poorFamilies: sql<number>`count(distinct ${rr.familyId}) filter (where ${rr.isFamilyHead} and ${rr.isPoor})`,
        specialNeeds: sql<number>`count(*) filter (where ${rr.hasSpecialNeeds})`,
        balita: sql<number>`count(*) filter (where ${rr.ageGroup} = 'balita')`,
        anak: sql<number>`count(*) filter (where ${rr.ageGroup} = 'anak')`,
        dewasa: sql<number>`count(*) filter (where ${rr.ageGroup} = 'dewasa')`,
        lansia: sql<number>`count(*) filter (where ${rr.ageGroup} = 'lansia')`,
        ...Object.fromEntries(
          HAZARDS.map((h) => [
            `h_${h.code}`,
            sql<number>`count(*) filter (where (${rr.hazardMask} & ${1 << h.bit}) <> 0)`,
          ]),
        ),
      })
      .from(rr)
      .where(approvedWhere);
    const a = approved as Record<string, unknown>;

    const byKelurahan = await db
      .select({
        id: regions.id,
        name: regions.name,
        approved: sql<number>`count(*) filter (where ${rr.approvalStatus} = 'disetujui')`,
        pending: sql<number>`count(*) filter (where ${rr.approvalStatus} = 'menunggu')`,
      })
      .from(rr)
      .innerJoin(regions, eq(regions.id, rr.kelurahanId))
      .where(scoped)
      .groupBy(regions.id, regions.name)
      .orderBy(asc(regions.name));

    const [zones] = await db
      .select({ n: count() })
      .from(hazardZones)
      .where(
        and(
          eq(hazardZones.fiscalYearId, fy.id),
          scope ? eq(hazardZones.kelurahanId, scope) : undefined,
        ),
      );

    const out: DashboardDto = {
      year,
      status: fy.status,
      revisionNo: fy.revisionNo,
      residents: {
        total: n(totals?.total),
        approved: n(totals?.approved),
        pending: n(totals?.pending),
        returned: n(totals?.returned),
        withoutNik: n(totals?.withoutNik),
        families: n(a.families),
        poorFamilies: n(a.poorFamilies),
        specialNeeds: n(a.specialNeeds),
        vulnerable: n(a.balita) + n(a.anak) + n(a.lansia),
      },
      ageGroups: { balita: n(a.balita), anak: n(a.anak), dewasa: n(a.dewasa), lansia: n(a.lansia) },
      byHazard: HAZARDS.map((h) => ({ code: h.code, name: h.name, persons: n(a[`h_${h.code}`]) })),
      byKelurahan: byKelurahan.map((k) => ({
        id: k.id,
        name: k.name,
        approved: n(k.approved),
        pending: n(k.pending),
      })),
      hazardZones: n(zones?.n),
      officers: null,
      events: null,
    };
    if (scope) return out;

    const [o] = await db
      .select({
        total: count(),
        pns: sql<number>`count(*) filter (where ${officerRecords.employmentStatus} = 'pns')`,
        tni: sql<number>`count(*) filter (where ${officerRecords.employmentStatus} = 'tni')`,
        polri: sql<number>`count(*) filter (where ${officerRecords.employmentStatus} = 'polri')`,
        satlinmas: sql<number>`count(*) filter (where ${officerRecords.employmentStatus} = 'satlinmas')`,
        kontrak: sql<number>`count(*) filter (where ${officerRecords.employmentStatus} = 'kontrak')`,
        non_aparatur: sql<number>`count(*) filter (where ${officerRecords.employmentStatus} = 'non_aparatur')`,
        trcPdb: sql<number>`count(*) filter (where ${officerRecords.isTrcPdb})`,
        trcKlb: sql<number>`count(*) filter (where ${officerRecords.isTrcKlb})`,
        ppe: sql<number>`count(*) filter (where ${officerRecords.isPpe})`,
        ops: sql<number>`count(*) filter (where ${officerRecords.isOps})`,
      })
      .from(officerRecords)
      .where(eq(officerRecords.fiscalYearId, fy.id));
    out.officers = {
      total: n(o?.total),
      byStatus: {
        pns: n(o?.pns),
        tni: n(o?.tni),
        polri: n(o?.polri),
        satlinmas: n(o?.satlinmas),
        kontrak: n(o?.kontrak),
        non_aparatur: n(o?.non_aparatur),
      },
      duties: { trcPdb: n(o?.trcPdb), trcKlb: n(o?.trcKlb), ppe: n(o?.ppe), ops: n(o?.ops) },
    };

    const months = await db
      .select({
        m: sql<number>`extract(month from ${disasterEvents.occurredAt} at time zone 'Asia/Makassar')`,
        n: count(),
      })
      .from(disasterEvents)
      .where(eq(disasterEvents.fiscalYearId, fy.id))
      .groupBy(sql`1`);
    const byMonth = Array.from({ length: 12 }, (_, i) =>
      n(months.find((x) => Number(x.m) === i + 1)?.n),
    );
    const affected = await db
      .select({ status: affectedPersons.status, n: count() })
      .from(affectedPersons)
      .innerJoin(disasterEvents, eq(disasterEvents.id, affectedPersons.eventId))
      .where(eq(disasterEvents.fiscalYearId, fy.id))
      .groupBy(affectedPersons.status);
    out.events = {
      total: byMonth.reduce((x, y) => x + y, 0),
      byMonth,
      affected: Object.fromEntries(
        AFFECTED_STATUSES.map((s) => [s, n(affected.find((x) => x.status === s)?.n)]),
      ) as Record<AffectedStatus, number>,
    };
    return out;
  }
}
