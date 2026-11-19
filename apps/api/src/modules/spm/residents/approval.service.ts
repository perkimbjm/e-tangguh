import { Injectable } from '@nestjs/common';
import type { ApproveResidentsRequest, ReturnResidentsRequest, SessionUser } from '@etangguh/shared';
import { and, eq, inArray } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { residentRecords } from '../../../db/schema';
import { sql } from 'drizzle-orm';
import { AuditContext } from '../../audit/audit-context';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';

/** Persetujuan berkelompok (per berkas, per kelurahan, atau daftar id) — R8, FR-028. */
@Injectable()
export class ApprovalService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsService,
  ) {}

  async approve(year: number, input: ApproveResidentsRequest, user: SessionUser): Promise<{ approved: number }> {
    const fy = await this.years.assertWritable(year);
    const target = input.batchId
      ? eq(residentRecords.importBatchId, input.batchId)
      : input.kelurahanId
        ? eq(residentRecords.kelurahanId, input.kelurahanId)
        : inArray(residentRecords.id, input.ids!);
    const rows = await this.db
      .executor()
      .update(residentRecords)
      .set({
        approvalStatus: 'disetujui',
        approvedBy: user.id,
        approvedAt: new Date(),
        approvalNote: null,
        rowVersion: sql`${residentRecords.rowVersion} + 1`,
      })
      .where(and(eq(residentRecords.fiscalYearId, fy.id), eq(residentRecords.approvalStatus, 'menunggu'), target))
      .returning({ id: residentRecords.id });
    AuditContext.annotate({
      entityId: input.batchId ?? input.kelurahanId ?? null,
      detail: { by: input.batchId ? 'batch' : input.kelurahanId ? 'kelurahan' : 'ids', count: rows.length },
    });
    return { approved: rows.length };
  }

  async returnRows(year: number, input: ReturnResidentsRequest, user: SessionUser): Promise<{ returned: number }> {
    const fy = await this.years.assertWritable(year);
    const rows = await this.db
      .executor()
      .update(residentRecords)
      .set({
        approvalStatus: 'dikembalikan',
        approvalNote: input.note,
        approvedBy: user.id,
        approvedAt: new Date(),
        rowVersion: sql`${residentRecords.rowVersion} + 1`,
      })
      .where(and(eq(residentRecords.fiscalYearId, fy.id), inArray(residentRecords.id, input.ids), inArray(residentRecords.approvalStatus, ['menunggu', 'disetujui'])))
      .returning({ id: residentRecords.id });
    AuditContext.annotate({ detail: { count: rows.length } });
    return { returned: rows.length };
  }
}
