import { Injectable } from '@nestjs/common';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { DbService } from '../../db/db.module';
import { dataCorrections, families, persons, residentRecords } from '../../db/schema';
import { ApiException } from '../../common/errors/api-exception';
import { AuditContext } from '../audit/audit-context';

/**
 * Menggabungkan catatan orang ganda (FR-025): seluruh keterangan dipindah ke orang tujuan, dan
 * catatan sumber ditandai `merged_into_id`. Ditolak bila keduanya tercatat pada tahun yang sama.
 */
@Injectable()
export class MergeService {
  constructor(private readonly db: DbService) {}

  async merge(sourceId: string, targetId: string): Promise<{ id: string; mergedInto: string; movedRecords: number }> {
    if (sourceId === targetId) throw ApiException.validation({ targetPersonId: 'Tidak dapat menggabungkan orang dengan dirinya sendiri' });
    const db = this.db.executor();
    const found = await db.select({ id: persons.id, mergedIntoId: persons.mergedIntoId }).from(persons).where(inArray(persons.id, [sourceId, targetId])).for('update');
    const source = found.find((p) => p.id === sourceId);
    const target = found.find((p) => p.id === targetId);
    if (!source || !target) throw ApiException.notFound('Orang tidak ditemukan');
    if (source.mergedIntoId || target.mergedIntoId) throw ApiException.conflict('SUDAH_DIGABUNG', 'Salah satu catatan sudah digabungkan sebelumnya');

    const [clash] = await db
      .select({ n: sql<number>`count(*)` })
      .from(residentRecords)
      .where(
        and(
          eq(residentRecords.personId, sourceId),
          sql`${residentRecords.fiscalYearId} IN (SELECT fiscal_year_id FROM resident_records WHERE person_id = ${targetId})`,
        ),
      );
    if (Number(clash?.n ?? 0) > 0) {
      throw ApiException.conflict('TAHUN_BENTROK', 'Kedua orang tercatat pada tahun anggaran yang sama; nonaktifkan salah satu lebih dahulu');
    }
    const moved = await db
      .update(residentRecords)
      .set({ personId: targetId, rowVersion: sql`${residentRecords.rowVersion} + 1` })
      .where(eq(residentRecords.personId, sourceId))
      .returning({ id: residentRecords.id });
    await db.update(families).set({ headPersonId: targetId }).where(eq(families.headPersonId, sourceId));
    await db.update(dataCorrections).set({ personId: targetId }).where(eq(dataCorrections.personId, sourceId));
    await db.update(persons).set({ mergedIntoId: targetId }).where(eq(persons.id, sourceId));
    AuditContext.annotate({ entityId: sourceId, detail: { mergedInto: targetId, movedRecords: moved.length } });
    return { id: sourceId, mergedInto: targetId, movedRecords: moved.length };
  }
}
