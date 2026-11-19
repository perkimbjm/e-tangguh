import { Injectable } from '@nestjs/common';
import type { FiscalYearDto, RevisionRequest, SnapshotDto } from '@etangguh/shared';
import { and, asc, eq } from 'drizzle-orm';
import { ApiException } from '../../../common/errors/api-exception';
import { DbService } from '../../../db/db.module';
import { files, fiscalYearSnapshots } from '../../../db/schema';
import { AuditContext } from '../../audit/audit-context';
import { FilesService } from '../../files/files.service';
import { FiscalYearsRepository } from './fiscal-years.repository';
import { FiscalYearsService, toFiscalYearDto } from './fiscal-years.service';

/** Revisi bernomor setelah final (Prinsip VII) dan akses arsip per revisi. */
@Injectable()
export class RevisionService {
  constructor(
    private readonly db: DbService,
    private readonly repo: FiscalYearsRepository,
    private readonly years: FiscalYearsService,
    private readonly filesService: FilesService,
  ) {}

  async open(year: number, input: RevisionRequest): Promise<FiscalYearDto> {
    const fy = await this.repo.findByYear(year, true);
    if (!fy) throw ApiException.notFound(`Tahun anggaran ${year} belum dibuka`);
    if (fy.status !== 'final')
      throw ApiException.conflict(
        'BUKAN_FINAL',
        'Revisi hanya dapat dibuka untuk tahun anggaran yang sudah final',
      );
    const row = await this.repo.update(fy.id, {
      status: 'revisi',
      revisionNo: fy.revisionNo + 1,
      revisionReason: input.reason,
    });
    AuditContext.annotate({ entityId: fy.id, detail: { year, revisionNo: row.revisionNo } });
    return toFiscalYearDto(row);
  }

  async snapshots(year: number): Promise<SnapshotDto[]> {
    const fy = await this.years.get(year);
    const rows = await this.db
      .executor()
      .select({ s: fiscalYearSnapshots, size: files.size })
      .from(fiscalYearSnapshots)
      .innerJoin(files, eq(files.id, fiscalYearSnapshots.archiveFileId))
      .where(eq(fiscalYearSnapshots.fiscalYearId, fy.id))
      .orderBy(asc(fiscalYearSnapshots.revisionNo));
    return rows.map(({ s, size }) => ({
      revisionNo: s.revisionNo,
      reason: s.reason,
      sha256: s.sha256,
      archiveSize: size,
      createdAt: s.createdAt.toISOString(),
      createdBy: s.createdBy,
    }));
  }

  async archive(
    year: number,
    rev: number,
  ): Promise<{ buffer: Buffer; filename: string; sha256: string }> {
    const fy = await this.years.get(year);
    const [target] = await this.db
      .executor()
      .select()
      .from(fiscalYearSnapshots)
      .where(
        and(eq(fiscalYearSnapshots.fiscalYearId, fy.id), eq(fiscalYearSnapshots.revisionNo, rev)),
      )
      .limit(1);
    if (!target) throw ApiException.notFound(`Arsip revisi ${rev} tidak ditemukan`);
    const file = await this.filesService.get(target.archiveFileId);
    AuditContext.annotate({ entityId: target.id, detail: { year, revisionNo: rev } });
    return {
      buffer: await this.filesService.read(file),
      filename: `form-5a-${year}-rev${rev}.zip`,
      sha256: target.sha256,
    };
  }
}
