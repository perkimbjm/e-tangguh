import { Injectable } from '@nestjs/common';
import {
  type CreateOfficerRequest,
  type FromVolunteerRequest,
  type OfficerDto,
  type SessionUser,
  type UpdateOfficerRequest,
  resolveEmploymentStatus,
} from '@etangguh/shared';
import { ApiException } from '../../../common/errors/api-exception';
import { AuditContext } from '../../audit/audit-context';
import { PersonsService } from '../../persons/persons.service';
import { RegionsRepository } from '../../regions/regions.repository';
import type { FiscalYearRow } from '../fiscal-years/fiscal-years.repository';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { HazardZonesRepository } from '../hazard-zones/hazard-zones.repository';
import { type OfficerInsert, OfficersRepository } from './officers.repository';
import { VolunteerSource } from './volunteer-source';

type OfficerFields = Omit<UpdateOfficerRequest, never>;

@Injectable()
export class OfficersService {
  constructor(
    private readonly repo: OfficersRepository,
    private readonly years: FiscalYearsService,
    private readonly persons: PersonsService,
    private readonly regions: RegionsRepository,
    private readonly zones: HazardZonesRepository,
    private readonly volunteers: VolunteerSource,
  ) {}

  async list(year: number): Promise<OfficerDto[]> {
    return this.repo.list((await this.years.get(year)).id);
  }

  private async assertKelurahan(id: string | null | undefined, field: string): Promise<void> {
    if (!id) return;
    const r = await this.regions.findById(id);
    if (r?.level !== 'kelurahan') throw ApiException.validation({ [field]: 'Kelurahan tidak ditemukan' });
  }

  /** Nilai kolom petugas: status dari jabatan, jenis bencana bawaan dari kawasan rawan kelurahan tugas. */
  async buildFields(fy: FiscalYearRow, input: OfficerFields & { position: NonNullable<OfficerFields['position']> }, current?: Partial<OfficerInsert>): Promise<Partial<OfficerInsert>> {
    const status = resolveEmploymentStatus(input.position, input.employmentStatus ?? current?.employmentStatus ?? null);
    if (!status) throw ApiException.validation({ employmentStatus: 'Pilih status kepegawaian' });
    const duty = input.dutyKelurahanId === undefined ? current?.dutyKelurahanId : input.dutyKelurahanId;
    if (input.position !== 'lainnya' && !duty) throw ApiException.validation({ dutyKelurahanId: 'Kelurahan wilayah tugas wajib diisi' });
    await this.assertKelurahan(duty, 'dutyKelurahanId');
    await this.assertKelurahan(input.postKelurahanId, 'postKelurahanId');
    const hazardMask = input.hazardMask ?? current?.hazardMask ?? (duty ? await this.zones.maskUnion(fy.id, duty) : 0);
    const { employmentStatus: _s, hazardMask: _h, ...rest } = input;
    return { ...rest, employmentStatus: status, dutyKelurahanId: duty ?? null, hazardMask };
  }

  async create(year: number, input: CreateOfficerRequest, user: SessionUser): Promise<OfficerDto> {
    const fy = await this.years.assertWritable(year);
    const identity = { fullName: input.fullName, gender: input.gender, birthPlace: input.birthPlace, birthDate: input.birthDate };
    const person = input.nik
      ? (await this.persons.findOrCreateByNik(input.nik, identity, user.id)).person
      : (await this.persons.createWithoutNik(identity, input.noNikReason ?? '', user.id)).person;
    return this.insertForPerson(fy, person.id, input, user, null);
  }

  async insertForPerson(fy: FiscalYearRow, personId: string, input: OfficerFields & { position: NonNullable<OfficerFields['position']> }, user: SessionUser, volunteerId: string | null): Promise<OfficerDto> {
    if (await this.repo.findByPerson(fy.id, personId)) throw ApiException.conflict('PETUGAS_SUDAH_TERCATAT', 'Orang ini sudah tercatat sebagai petugas pada tahun anggaran ini');
    const fields = await this.buildFields(fy, input);
    const row = await this.repo.insert({ ...fields, position: input.position, employmentStatus: fields.employmentStatus!, fiscalYearId: fy.id, personId, volunteerId, createdBy: user.id });
    AuditContext.annotate({ entityId: row.id, detail: { position: row.position, dutyKelurahanId: row.dutyKelurahanId } });
    return (await this.repo.list(fy.id, row.id))[0]!;
  }

  async update(year: number, id: string, input: UpdateOfficerRequest): Promise<OfficerDto> {
    const fy = await this.years.assertWritable(year);
    const current = await this.repo.findById(fy.id, id);
    if (!current) throw ApiException.notFound('Petugas tidak ditemukan');
    const fields = await this.buildFields(fy, { ...input, position: input.position ?? current.position }, current);
    await this.repo.update(id, fields);
    return (await this.repo.list(fy.id, id))[0]!;
  }

  async remove(year: number, id: string): Promise<void> {
    const fy = await this.years.assertWritable(year);
    if (!(await this.repo.findById(fy.id, id))) throw ApiException.notFound('Petugas tidak ditemukan');
    await this.repo.delete(id);
  }

  async fromVolunteer(year: number, volunteerId: string, input: FromVolunteerRequest, user: SessionUser): Promise<OfficerDto> {
    const fy = await this.years.assertWritable(year);
    const v = await this.volunteers.getVerified(volunteerId);
    return this.insertForPerson(fy, v.personId, { ...input, certifications: input.certifications ?? v.certifications }, user, volunteerId);
  }
}
