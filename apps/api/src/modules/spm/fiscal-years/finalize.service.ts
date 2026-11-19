import { Injectable } from '@nestjs/common';
import { type FinalizeResult, RECAP_FORM_CODES, type SessionUser } from '@etangguh/shared';
import { and, count, eq } from 'drizzle-orm';
import { ApiException } from '../../../common/errors/api-exception';
import { DbService } from '../../../db/db.module';
import { fiscalYearSnapshots, residentRecords } from '../../../db/schema';
import { AuditContext } from '../../audit/audit-context';
import { FilesService } from '../../files/files.service';
import { ExportsService } from '../exports/exports.service';
import { RecapService } from '../recap/recap.service';
import { FiscalYearsRepository } from './fiscal-years.repository';

const ARCHIVE_MAX = 512 * 1024 * 1024;

/**
 * Finalisasi (R3): dalam satu transaksi, membuat ZIP seluruh ekspor Form 5.A, menyimpan cuplikan
 * rekap dan sidik SHA-256 pada `fiscal_year_snapshots`, lalu mengunci tahun anggaran.
 */
@Injectable()
export class FinalizeService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsRepository,
    private readonly exports: ExportsService,
    private readonly recap: RecapService,
    private readonly files: FilesService,
  ) {}

  async finalize(year: number, user: SessionUser): Promise<FinalizeResult> {
    const fy = await this.years.findByYear(year, true);
    if (!fy) throw ApiException.notFound(`Tahun anggaran ${year} belum dibuka`);
    if (fy.status === 'final')
      throw ApiException.conflict('SUDAH_FINAL', `Tahun anggaran ${year} sudah final`);

    const [pending] = await this.db
      .executor()
      .select({ n: count() })
      .from(residentRecords)
      .where(
        and(
          eq(residentRecords.fiscalYearId, fy.id),
          eq(residentRecords.approvalStatus, 'menunggu'),
        ),
      );
    if (Number(pending?.n ?? 0) > 0) {
      throw ApiException.conflict(
        'MASIH_ADA_MENUNGGU',
        `Masih ada ${pending!.n} baris warga menunggu persetujuan. Setujui atau kembalikan sebelum finalisasi.`,
      );
    }
    if (fy.status === 'revisi' && !fy.revisionReason)
      throw ApiException.validation({ reason: 'Alasan revisi tidak tercatat' });

    const archive = await this.exports.exportAll(year);
    const file = await this.files.save({
      data: archive.buffer,
      kind: 'arsip',
      ownerUserId: user.id,
      allowed: ['application/zip', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      maxBytes: ARCHIVE_MAX,
      originalName: `form-5a-${year}-rev${fy.revisionNo}.zip`,
    });
    const recapJson: Record<string, unknown> = {};
    for (const code of RECAP_FORM_CODES)
      recapJson[code] = await this.recap.compute(code, fy.id, year, null);

    await this.db
      .executor()
      .insert(fiscalYearSnapshots)
      .values({
        fiscalYearId: fy.id,
        revisionNo: fy.revisionNo,
        reason: fy.status === 'revisi' ? fy.revisionReason : null,
        recapJson,
        archiveFileId: file.id,
        sha256: archive.sha256,
        createdBy: user.id,
      });
    await this.years.update(fy.id, {
      status: 'final',
      finalizedAt: new Date(),
      finalizedBy: user.id,
      revisionReason: null,
    });
    AuditContext.annotate({
      entityId: fy.id,
      detail: { year, revisionNo: fy.revisionNo, sha256: archive.sha256 },
    });
    return { year, revisionNo: fy.revisionNo, sha256: archive.sha256, status: 'final' };
  }
}
