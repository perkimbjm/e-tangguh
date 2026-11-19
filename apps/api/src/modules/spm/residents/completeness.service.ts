import { Controller, Get, Injectable, Param, ParseIntPipe, Query } from '@nestjs/common';
import { SPM_ROLES, type CompletenessRow, type SessionUser } from '@etangguh/shared';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { KelurahanScope } from '../../../common/guards/kelurahan-scope';
import { DbService } from '../../../db/db.module';
import { persons, regions, residentRecords } from '../../../db/schema';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';

/** Ringkasan kelengkapan per kelurahan (FR-018). "Belum lengkap" = tanpa KK atau tanpa tempat lahir. */
@Injectable()
export class CompletenessService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsService,
  ) {}

  async summary(year: number, user: SessionUser, kelurahan?: string): Promise<CompletenessRow[]> {
    const fy = await this.years.get(year);
    const kelurahanId = KelurahanScope.resolve(user, kelurahan);
    const kec = alias(regions, 'kecamatan');
    const rows = await this.db
      .executor()
      .select({
        kelurahanId: residentRecords.kelurahanId,
        kelurahanName: regions.name,
        kecamatanName: kec.name,
        total: count(),
        pending: sql<number>`count(*) filter (where ${residentRecords.approvalStatus} = 'menunggu')`,
        returned: sql<number>`count(*) filter (where ${residentRecords.approvalStatus} = 'dikembalikan')`,
        incomplete: sql<number>`count(*) filter (where ${residentRecords.familyId} is null or ${persons.birthPlace} is null)`,
        withoutNik: sql<number>`count(*) filter (where ${persons.nikHash} is null)`,
      })
      .from(residentRecords)
      .innerJoin(persons, eq(persons.id, residentRecords.personId))
      .innerJoin(regions, eq(regions.id, residentRecords.kelurahanId))
      .leftJoin(kec, eq(kec.id, regions.parentId))
      .where(and(eq(residentRecords.fiscalYearId, fy.id), eq(residentRecords.isActive, true), kelurahanId ? eq(residentRecords.kelurahanId, kelurahanId) : undefined))
      .groupBy(residentRecords.kelurahanId, regions.name, kec.name)
      .orderBy(asc(kec.name), asc(regions.name));
    return rows.map((r) => ({
      ...r,
      total: Number(r.total),
      pending: Number(r.pending),
      returned: Number(r.returned),
      incomplete: Number(r.incomplete),
      withoutNik: Number(r.withoutNik),
    }));
  }
}

@Controller('spm/:fy/completeness')
export class CompletenessController {
  constructor(private readonly service: CompletenessService) {}

  @Roles(...SPM_ROLES)
  @Get()
  async summary(@Param('fy', ParseIntPipe) fy: number, @CurrentUser() user: SessionUser, @Query('kelurahan') kelurahan?: string) {
    return { items: await this.service.summary(fy, user, kelurahan || undefined) };
  }
}
