import { Injectable } from '@nestjs/common';
import type { HazardZoneDto, HazardZoneRequest, SessionUser, UpdateHazardZoneRequest } from '@etangguh/shared';
import { ApiException } from '../../../common/errors/api-exception';
import { KelurahanScope } from '../../../common/guards/kelurahan-scope';
import { RegionsRepository } from '../../regions/regions.repository';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { type HazardZoneRow, HazardZonesRepository } from './hazard-zones.repository';

@Injectable()
export class HazardZonesService {
  constructor(
    private readonly repo: HazardZonesRepository,
    private readonly years: FiscalYearsService,
    private readonly regions: RegionsRepository,
  ) {}

  async list(year: number, user: SessionUser, kelurahan?: string): Promise<HazardZoneDto[]> {
    const fy = await this.years.get(year);
    return this.repo.list(fy.id, KelurahanScope.resolve(user, kelurahan));
  }

  /** Kawasan yang memuat RT/RW tertentu; RT spesifik diutamakan atas penetapan seluruh RW. */
  async resolveZone(fiscalYearId: string, kelurahanId: string, rw: string, rt: string | null): Promise<HazardZoneRow | null> {
    const index = await this.repo.index(fiscalYearId, kelurahanId);
    return index.resolve(kelurahanId, rw, rt);
  }

  private async assertKelurahan(id: string): Promise<void> {
    const region = await this.regions.findById(id);
    if (region?.level !== 'kelurahan') throw ApiException.validation({ kelurahanId: 'Kelurahan tidak ditemukan' });
  }

  async create(year: number, input: HazardZoneRequest, actorId: string): Promise<HazardZoneRow> {
    const fy = await this.years.assertWritable(year);
    await this.assertKelurahan(input.kelurahanId);
    return this.repo.insert({ ...input, rt: input.rt ?? null, fiscalYearId: fy.id, createdBy: actorId });
  }

  async update(year: number, id: string, input: UpdateHazardZoneRequest): Promise<HazardZoneRow> {
    const fy = await this.years.assertWritable(year);
    if (!(await this.repo.findById(fy.id, id))) throw ApiException.notFound('Kawasan rawan tidak ditemukan');
    if (input.kelurahanId) await this.assertKelurahan(input.kelurahanId);
    return this.repo.update(id, input);
  }

  async remove(year: number, id: string): Promise<void> {
    const fy = await this.years.assertWritable(year);
    if (!(await this.repo.findById(fy.id, id))) throw ApiException.notFound('Kawasan rawan tidak ditemukan');
    await this.repo.delete(id);
  }
}
