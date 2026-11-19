import { Injectable } from '@nestjs/common';
import type { RecapContext } from '@etangguh/shared';
import { and, asc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DbService } from '../../../db/db.module';
import { hazardZones, regions, residentRecords } from '../../../db/schema';
import { residentBase } from './recap-query.builder';

/** Dimensi rekap: kelurahan yang memiliki kawasan rawan atau warga, serta variasi kerawanan. */
@Injectable()
export class RecapContextLoader {
  constructor(private readonly db: DbService) {}

  async load(fiscalYearId: string, scopeKelurahanId: string | null): Promise<RecapContext> {
    const kec = alias(regions, 'kecamatan');
    const kelurahan = await this.db
      .executor()
      .select({ id: regions.id, name: regions.name, kecamatanId: kec.id, kecamatanName: kec.name })
      .from(regions)
      .leftJoin(kec, eq(kec.id, regions.parentId))
      .where(
        and(
          eq(regions.level, 'kelurahan'),
          scopeKelurahanId ? eq(regions.id, scopeKelurahanId) : undefined,
          sql`(EXISTS (SELECT 1 FROM ${hazardZones} WHERE ${hazardZones.kelurahanId} = ${regions.id} AND ${hazardZones.fiscalYearId} = ${fiscalYearId})
            OR EXISTS (SELECT 1 FROM ${residentRecords} WHERE ${residentRecords.kelurahanId} = ${regions.id} AND ${residentRecords.fiscalYearId} = ${fiscalYearId}))`,
        ),
      )
      .orderBy(asc(kec.name), asc(regions.name));
    const masks = await this.db
      .executor()
      .selectDistinct({ mask: residentRecords.hazardMask })
      .from(residentRecords)
      .where(residentBase(fiscalYearId, scopeKelurahanId));
    return { kelurahan, masks: masks.map((m) => m.mask) };
  }
}
