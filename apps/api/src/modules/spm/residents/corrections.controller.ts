import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { BPBD_ROLES, createCorrectionSchema, type CreateCorrectionRequest, type SessionUser } from '@etangguh/shared';
import { desc, eq } from 'drizzle-orm';
import { CurrentUser, Roles } from '../../../common/decorators/roles.decorator';
import { ApiException } from '../../../common/errors/api-exception';
import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe';
import { DbService } from '../../../db/db.module';
import { dataCorrections, persons } from '../../../db/schema';
import { Audit } from '../../audit/audit.decorator';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';

/** Permintaan pembetulan data dari subjek data yang dicatat BPBD (Prinsip I). */
@Controller('spm/:fy/corrections')
@Roles(...BPBD_ROLES)
export class CorrectionsController {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsService,
  ) {}

  @Get()
  async list(@Param('fy', ParseIntPipe) fy: number) {
    const year = await this.years.get(fy);
    const items = await this.db
      .executor()
      .select({
        id: dataCorrections.id,
        personId: dataCorrections.personId,
        fullName: persons.fullName,
        requestedVia: dataCorrections.requestedVia,
        message: dataCorrections.message,
        status: dataCorrections.status,
        resolutionNote: dataCorrections.resolutionNote,
        createdAt: dataCorrections.createdAt,
      })
      .from(dataCorrections)
      .innerJoin(persons, eq(persons.id, dataCorrections.personId))
      .where(eq(dataCorrections.fiscalYearId, year.id))
      .orderBy(desc(dataCorrections.createdAt));
    return { items };
  }

  @Post()
  @Audit('correction.create', 'data_corrections')
  async create(
    @Param('fy', ParseIntPipe) fy: number,
    @CurrentUser() user: SessionUser,
    @Body(new ZodValidationPipe(createCorrectionSchema)) body: CreateCorrectionRequest,
  ) {
    const year = await this.years.get(fy);
    const [person] = await this.db.executor().select({ id: persons.id }).from(persons).where(eq(persons.id, body.personId)).limit(1);
    if (!person) throw ApiException.notFound('Orang tidak ditemukan');
    const [row] = await this.db
      .executor()
      .insert(dataCorrections)
      .values({ ...body, fiscalYearId: year.id, createdBy: user.id })
      .returning({ id: dataCorrections.id, status: dataCorrections.status });
    return row!;
  }
}
