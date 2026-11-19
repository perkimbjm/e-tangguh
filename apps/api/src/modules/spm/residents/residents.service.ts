import { Injectable } from '@nestjs/common';
import type {
  CreateResidentRequest,
  DeactivateResidentRequest,
  Paged,
  ResidentDetail,
  ResidentListItem,
  ListResidentsQuery,
  SessionUser,
  UpdateResidentRequest,
} from '@etangguh/shared';
import { isSixteenDigits, normalizeIdNumber } from '@etangguh/shared';
import { ApiException } from '../../../common/errors/api-exception';
import { KelurahanScope } from '../../../common/guards/kelurahan-scope';
import { FieldCipher } from '../../../crypto/field-cipher';
import { AuditContext } from '../../audit/audit-context';
import { PersonsRepository } from '../../persons/persons.repository';
import { PersonsService } from '../../persons/persons.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { HazardZonesService } from '../hazard-zones/hazard-zones.service';
import { computeAgeGroup, defaultSource, initialApproval, today } from './resident-rules';
import { ResidentsMapper } from './residents.mapper';
import { ResidentsRepository, encodeCursor, type ResidentRecordRow } from './residents.repository';

@Injectable()
export class ResidentsService {
  constructor(
    private readonly repo: ResidentsRepository,
    private readonly mapper: ResidentsMapper,
    private readonly years: FiscalYearsService,
    private readonly zones: HazardZonesService,
    private readonly persons: PersonsService,
    private readonly personsRepo: PersonsRepository,
    private readonly cipher: FieldCipher,
  ) {}

  async list(year: number, user: SessionUser, q: ListResidentsQuery): Promise<Paged<ResidentListItem>> {
    const fy = await this.years.get(year);
    const kelurahanId = KelurahanScope.resolve(user, q.kelurahan);
    const nik = q.nik ? normalizeIdNumber(q.nik) : '';
    if (q.nik && !isSixteenDigits(nik)) throw ApiException.validation({ nik: 'Pencarian NIK harus 16 digit' });
    const rows = await this.repo.list(fy.id, { ...q, kelurahanId, nikHash: nik ? this.persons.nikHash(nik) : undefined });
    const page = rows.slice(0, q.limit);
    const last = page[page.length - 1];
    return {
      items: page.map((r) => this.mapper.toListItem(r)),
      nextCursor: rows.length > q.limit && last ? encodeCursor({ n: last.person.fullName, i: last.record.id }) : null,
    };
  }

  async detail(year: number, id: string, user: SessionUser): Promise<ResidentDetail> {
    const fy = await this.years.get(year);
    const row = await this.repo.findJoined(fy.id, id);
    if (!row) throw ApiException.notFound('Data warga tidak ditemukan');
    KelurahanScope.assert(user, row.record.kelurahanId);
    AuditContext.annotate({ entityId: id, detail: { kelurahanId: row.record.kelurahanId } });
    return this.mapper.toDetail(row);
  }

  private async requireZone(fiscalYearId: string, kelurahanId: string, rw: string, rt: string | null) {
    const zone = await this.zones.resolveZone(fiscalYearId, kelurahanId, rw, rt);
    if (!zone) {
      throw new ApiException(400, 'DI_LUAR_KAWASAN_RAWAN', 'RT/RW ini belum ditetapkan sebagai kawasan rawan bencana', {
        rw: 'RT/RW belum ditetapkan sebagai kawasan rawan',
      });
    }
    return zone;
  }

  async create(year: number, input: CreateResidentRequest, user: SessionUser) {
    const fy = await this.years.assertWritable(year);
    KelurahanScope.assert(user, input.kelurahanId);
    const zone = await this.requireZone(fy.id, input.kelurahanId, input.rw, input.rt ?? null);

    const identity = { fullName: input.fullName, gender: input.gender, birthPlace: input.birthPlace, birthDate: input.birthDate };
    let duplicateCandidates: { id: string; fullName: string; score: number }[] = [];
    let personId: string;
    let birthDate = input.birthDate;
    if (input.nik) {
      const { person } = await this.persons.findOrCreateByNik(input.nik, identity, user.id);
      personId = person.id;
      birthDate = person.birthDate ?? input.birthDate;
    } else {
      const res = await this.persons.createWithoutNik(identity, input.noNikReason ?? '', user.id);
      personId = res.person.id;
      duplicateCandidates = res.duplicateCandidates.map(({ id, fullName, score }) => ({ id, fullName, score }));
    }
    if (await this.repo.findByPerson(fy.id, personId)) {
      // Tidak menyebut kelurahan tempat warga tercatat (Prinsip I).
      throw ApiException.conflict('WARGA_SUDAH_TERCATAT', 'Warga ini sudah tercatat pada tahun anggaran ini');
    }
    const familyId = input.kk ? (await this.persons.findOrCreateFamily(input.kk, input.isFamilyHead ? personId : undefined, user.id)).family.id : null;

    const record = await this.repo.insert({
      fiscalYearId: fy.id,
      personId,
      familyId,
      isFamilyHead: input.isFamilyHead,
      kelurahanId: input.kelurahanId,
      rw: input.rw,
      rt: input.rt ?? null,
      hazardZoneId: zone.id,
      addressEnc: this.cipher.encrypt(input.address),
      isPoor: input.isPoor,
      hasSpecialNeeds: input.hasSpecialNeeds,
      specialNeedsEnc: input.hasSpecialNeeds ? this.cipher.encryptNullable(input.specialNeeds) : null,
      ageGroup: computeAgeGroup(birthDate, fy),
      hazardMask: input.hazardMask ?? zone.hazardMask,
      source: input.source ?? defaultSource(user.role),
      sourceDate: input.sourceDate ?? today(),
      createdBy: user.id,
      ...initialApproval(user.role, user.id),
    });
    AuditContext.annotate({ entityId: record.id, detail: { kelurahanId: record.kelurahanId, withoutNik: !input.nik } });
    return { id: record.id, approvalStatus: record.approvalStatus, rowVersion: record.rowVersion, duplicateCandidates };
  }

  private async loadForWrite(year: number, id: string, user: SessionUser) {
    const fy = await this.years.assertWritable(year);
    const current = await this.repo.findById(fy.id, id);
    if (!current) throw ApiException.notFound('Data warga tidak ditemukan');
    KelurahanScope.assert(user, current.kelurahanId);
    return { fy, current };
  }

  async update(year: number, id: string, input: UpdateResidentRequest, user: SessionUser) {
    const { fy, current } = await this.loadForWrite(year, id, user);
    if (current.rowVersion !== input.rowVersion) throw ApiException.staleVersion();
    const kelurahanId = input.kelurahanId ?? current.kelurahanId;
    KelurahanScope.assert(user, kelurahanId);
    const rw = input.rw ?? current.rw;
    const rt = input.rt === undefined ? current.rt : input.rt ?? null;
    const changes: Partial<ResidentRecordRow> = {};

    if (kelurahanId !== current.kelurahanId || rw !== current.rw || rt !== current.rt) {
      const zone = await this.requireZone(fy.id, kelurahanId, rw, rt);
      Object.assign(changes, { kelurahanId, rw, rt, hazardZoneId: zone.id });
    }
    await this.personsRepo.updateIdentity(current.personId, {
      ...(input.fullName ? { fullName: input.fullName } : {}),
      ...(input.gender ? { gender: input.gender } : {}),
      ...(input.birthPlace !== undefined ? { birthPlace: input.birthPlace ?? null } : {}),
      ...(input.birthDate ? { birthDate: input.birthDate } : {}),
    });
    if (input.ageGroup) {
      Object.assign(changes, { ageGroup: input.ageGroup, ageGroupOverrideReason: input.ageGroupOverrideReason });
    } else if (input.birthDate) {
      Object.assign(changes, { ageGroup: computeAgeGroup(input.birthDate, fy), ageGroupOverrideReason: null });
    }
    if (input.kk) changes.familyId = (await this.persons.findOrCreateFamily(input.kk, undefined, user.id)).family.id;
    if (input.isFamilyHead !== undefined) changes.isFamilyHead = input.isFamilyHead;
    if (input.address) changes.addressEnc = this.cipher.encrypt(input.address);
    if (input.isPoor !== undefined) changes.isPoor = input.isPoor;
    if (input.hasSpecialNeeds !== undefined) {
      changes.hasSpecialNeeds = input.hasSpecialNeeds;
      changes.specialNeedsEnc = input.hasSpecialNeeds ? this.cipher.encryptNullable(input.specialNeeds) : null;
    }
    if (input.hazardMask !== undefined) changes.hazardMask = input.hazardMask;
    if (input.source) changes.source = input.source;
    if (input.sourceDate) changes.sourceDate = input.sourceDate;
    // Perubahan oleh pendata kembali menunggu persetujuan BPBD.
    Object.assign(changes, initialApproval(user.role, user.id), { approvalNote: null });

    const updated = await this.repo.updateVersioned(id, input.rowVersion, changes);
    if (!updated) throw ApiException.staleVersion();
    AuditContext.annotate({ entityId: id, detail: { fields: Object.keys(input).filter((k) => k !== 'rowVersion') } });
    return { id, approvalStatus: updated.approvalStatus, rowVersion: updated.rowVersion };
  }

  async deactivate(year: number, id: string, input: DeactivateResidentRequest, user: SessionUser) {
    const { current } = await this.loadForWrite(year, id, user);
    if (current.rowVersion !== input.rowVersion) throw ApiException.staleVersion();
    const updated = await this.repo.updateVersioned(id, input.rowVersion, {
      isActive: false,
      inactiveReason: input.reason,
      inactiveDate: input.date,
    });
    if (!updated) throw ApiException.staleVersion();
    AuditContext.annotate({ entityId: id, detail: { reason: input.reason } });
    return { id, isActive: false, rowVersion: updated.rowVersion };
  }
}
