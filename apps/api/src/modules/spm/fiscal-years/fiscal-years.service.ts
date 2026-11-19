import { Injectable } from '@nestjs/common';
import {
  DEFAULT_AGE_BANDS,
  type CreateFiscalYearRequest,
  type FiscalYearDto,
  type FiscalYearSettingsRequest,
} from '@etangguh/shared';
import { ApiException } from '../../../common/errors/api-exception';
import { type FiscalYearRow, FiscalYearsRepository } from './fiscal-years.repository';

export function toFiscalYearDto(
  row: FiscalYearRow,
  copiedFromYear: number | null = null,
): FiscalYearDto {
  return {
    id: row.id,
    year: row.year,
    status: row.status,
    revisionNo: row.revisionNo,
    ageReferenceDate: row.ageReferenceDate,
    ageBands: row.ageBands,
    finalizedAt: row.finalizedAt ? row.finalizedAt.toISOString() : null,
    revisionReason: row.revisionReason,
    copiedFromYear,
  };
}

@Injectable()
export class FiscalYearsService {
  constructor(private readonly repo: FiscalYearsRepository) {}

  async list(): Promise<FiscalYearDto[]> {
    const rows = await this.repo.list();
    const yearOf = new Map(rows.map((r) => [r.id, r.year]));
    return rows.map((r) =>
      toFiscalYearDto(r, r.copiedFromId ? (yearOf.get(r.copiedFromId) ?? null) : null),
    );
  }

  async get(year: number): Promise<FiscalYearRow> {
    const row = await this.repo.findByYear(year);
    if (!row) throw ApiException.notFound(`Tahun anggaran ${year} belum dibuka`);
    return row;
  }

  /** Mengembalikan tahun anggaran yang boleh ditulis; 423 bila sudah final. */
  async assertWritable(year: number): Promise<FiscalYearRow> {
    const row = await this.get(year);
    if (row.status === 'final') throw ApiException.yearLocked(year);
    return row;
  }

  /** Membuka tahun anggaran kosong. Salin maju ditangani CopyForwardService. */
  async create(input: CreateFiscalYearRequest, actorId: string): Promise<FiscalYearRow> {
    if (await this.repo.findByYear(input.year)) {
      throw ApiException.conflict('TAHUN_SUDAH_ADA', `Tahun anggaran ${input.year} sudah dibuka`);
    }
    return this.repo.insert({
      year: input.year,
      ageReferenceDate: `${input.year}-12-31`,
      ageBands: DEFAULT_AGE_BANDS,
      createdBy: actorId,
    });
  }

  async updateSettings(year: number, input: FiscalYearSettingsRequest): Promise<FiscalYearDto> {
    const row = await this.assertWritable(year);
    const updated = await this.repo.update(row.id, {
      ...(input.ageReferenceDate ? { ageReferenceDate: input.ageReferenceDate } : {}),
      ...(input.ageBands ? { ageBands: input.ageBands } : {}),
    });
    return toFiscalYearDto(updated);
  }
}
