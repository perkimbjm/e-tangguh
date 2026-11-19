import { Injectable } from '@nestjs/common';
import {
  EMPLOYMENT_LABEL,
  type OfficerCardDto,
  POSITION_LABEL,
  computeAttributes,
} from '@etangguh/shared';
import { and, asc, eq, inArray, min } from 'drizzle-orm';
import { ApiException } from '../../../common/errors/api-exception';
import { DbService } from '../../../db/db.module';
import {
  disasterEvents,
  eventOfficers,
  fiscalYears,
  officerRecords,
  persons,
  regions,
} from '../../../db/schema';
import { dateWita } from '../exports/providers/event-format';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/**
 * Kartu kompetensi dan kesiapan petugas: menerapkan rumus atribut versi 1 pada data petugas yang
 * dicatat BPBD. Pemetaan masukan (sementara, sampai modul relawan fitur 001 tersedia):
 * sertifikat = entri kolom sertifikasi (tingkat dasar); hari penugasan = 1 per kejadian aktif;
 * ketersediaan = siaga bila memiliki penugasan aktif tahun ini; masa bakti = sejak tahun anggaran
 * pertama tercatat. Jam pelatihan dan kepemimpinan belum memiliki sumber data (nilai 1).
 */
@Injectable()
export class OfficerCardsService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsService,
  ) {}

  async list(year: number, id?: string): Promise<OfficerCardDto[]> {
    const fy = await this.years.get(year);
    const db = this.db.executor();
    const rows = await db
      .select({ o: officerRecords, fullName: persons.fullName, duty: regions.name })
      .from(officerRecords)
      .innerJoin(persons, eq(persons.id, officerRecords.personId))
      .leftJoin(regions, eq(regions.id, officerRecords.dutyKelurahanId))
      .where(
        and(eq(officerRecords.fiscalYearId, fy.id), id ? eq(officerRecords.id, id) : undefined),
      )
      .orderBy(asc(persons.fullName));
    if (id && rows.length === 0) throw ApiException.notFound('Petugas tidak ditemukan');
    if (!rows.length) return [];

    const ids = rows.map((r) => r.o.id);
    const personIds = rows.map((r) => r.o.personId);
    const deployments = await db
      .select({
        officerId: eventOfficers.officerRecordId,
        eventId: disasterEvents.id,
        name: disasterEvents.name,
        at: disasterEvents.occurredAt,
      })
      .from(eventOfficers)
      .innerJoin(disasterEvents, eq(disasterEvents.id, eventOfficers.eventId))
      .where(inArray(eventOfficers.officerRecordId, ids));
    const firstYear = await db
      .select({ personId: officerRecords.personId, first: min(fiscalYears.year) })
      .from(officerRecords)
      .innerJoin(fiscalYears, eq(fiscalYears.id, officerRecords.fiscalYearId))
      .where(inArray(officerRecords.personId, personIds))
      .groupBy(officerRecords.personId);
    const firstByPerson = new Map(firstYear.map((f) => [f.personId, Number(f.first)]));
    const today = new Date().toISOString().slice(0, 10);

    return rows.map(({ o, fullName, duty }) => {
      const certs = (o.certifications ?? '')
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const deps = deployments.filter((d) => d.officerId === o.id);
      const active = o.isOps || o.isTrcKlb || o.isTrcPdb || o.isPpe;
      const first = firstByPerson.get(o.personId) ?? fy.year;
      const attributes = computeAttributes(
        {
          certificates: certs.map((label, i) => ({
            id: `sertifikat-${i + 1}`,
            label,
            level: 'dasar' as const,
          })),
          trainings: [],
          deployments: deps.map((d) => ({
            id: d.eventId,
            label: `${d.name} (${dateWita(d.at)})`,
            days: 1,
          })),
          availability: active ? 'siaga' : 'terbatas',
          lastUpdatedAt: o.updatedAt.toISOString(),
          joinedAt: `${first}-01-01`,
          activeOfficerRoles: 0,
        },
        undefined,
        today,
      );
      return {
        id: o.id,
        fullName,
        initials: initials(fullName),
        position: o.position,
        positionLabel: POSITION_LABEL[o.position],
        employmentLabel: EMPLOYMENT_LABEL[o.employmentStatus],
        dutyKelurahanName: duty,
        duties: [
          o.isTrcPdb && 'TRC PDB',
          o.isTrcKlb && 'TRC KLB',
          o.isPpe && 'PPE',
          o.isOps && 'Operasi',
        ].filter((x): x is string => Boolean(x)),
        hazardMask: o.hazardMask,
        availability: active ? 'siaga' : 'terbatas',
        attributes,
        noData: ['lat', 'kep'],
        stats: {
          certificates: certs.length,
          deployments: deps.length,
          yearsActive: Math.max(0, fy.year - first),
        },
      };
    });
  }
}
