import { Injectable } from '@nestjs/common';
import type { SessionUser } from '@etangguh/shared';
import { FieldCipher } from '../../../crypto/field-cipher';
import { PersonsRepository } from '../../persons/persons.repository';
import { PersonsService } from '../../persons/persons.service';
import type { FiscalYearRow } from '../fiscal-years/fiscal-years.repository';
import { computeAgeGroup, defaultSource, initialApproval, today } from '../residents/resident-rules';
import { ResidentsRepository } from '../residents/residents.repository';
import type { ImportBatchRow } from './imports.repository';
import { ImportsRepository } from './imports.repository';
import type { ResolvedResidentRow, ValidatedRow } from './import-validator';

/** Menerapkan baris impor tervalidasi ke data utama (dalam transaksi konfirmasi). */
@Injectable()
export class ImportApply {
  constructor(
    private readonly persons: PersonsService,
    private readonly personsRepo: PersonsRepository,
    private readonly residents: ResidentsRepository,
    private readonly imports: ImportsRepository,
    private readonly cipher: FieldCipher,
  ) {}

  async applyResidents(rows: (ValidatedRow & { id: string })[], batch: ImportBatchRow, fy: FiscalYearRow, user: SessionUser): Promise<void> {
    const source = `${defaultSource(user.role)} (impor Form 5.A.1)`;
    for (const r of rows) {
      if (r.outcome !== 'baru' && r.outcome !== 'berubah') continue;
      const n = r.normalized as ResolvedResidentRow;
      const identity = { fullName: n.fullName, gender: n.gender, birthPlace: n.birthPlace, birthDate: n.birthDate };
      if (r.outcome === 'baru') {
        const personId =
          r.existingPersonId ??
          (n.nik
            ? (await this.persons.findOrCreateByNik(n.nik, identity, user.id)).person.id
            : (await this.persons.createWithoutNik(identity, n.noNikReason ?? 'tidak disebutkan', user.id)).person.id);
        const familyId = n.kk ? (await this.persons.findOrCreateFamily(n.kk, n.isFamilyHead ? personId : undefined, user.id)).family.id : null;
        const record = await this.residents.insert({
          fiscalYearId: fy.id,
          personId,
          familyId,
          isFamilyHead: n.isFamilyHead,
          kelurahanId: n.kelurahanId,
          rw: n.rw,
          rt: n.rt,
          hazardZoneId: n.hazardZoneId,
          addressEnc: this.cipher.encrypt(n.address),
          isPoor: n.isPoor,
          hasSpecialNeeds: n.hasSpecialNeeds,
          specialNeedsEnc: n.hasSpecialNeeds ? this.cipher.encryptNullable(n.specialNeeds) : null,
          ageGroup: computeAgeGroup(n.birthDate, fy),
          hazardMask: n.hazardMask,
          source,
          sourceDate: today(),
          importBatchId: batch.id,
          createdBy: user.id,
          ...initialApproval(user.role, user.id),
        });
        await this.imports.setTarget(r.id, record.id);
        continue;
      }
      const current = await this.residents.findById(fy.id, r.targetRecordId!);
      if (!current) continue;
      await this.personsRepo.updateIdentity(current.personId, identity);
      const familyId = n.kk ? (await this.persons.findOrCreateFamily(n.kk, n.isFamilyHead ? current.personId : undefined, user.id)).family.id : null;
      const zoneChanged = current.hazardZoneId !== n.hazardZoneId;
      await this.residents.update(current.id, {
        familyId,
        isFamilyHead: n.isFamilyHead,
        rw: n.rw,
        rt: n.rt,
        hazardZoneId: n.hazardZoneId,
        ...(zoneChanged ? { hazardMask: n.hazardMask } : {}),
        addressEnc: this.cipher.encrypt(n.address),
        isPoor: n.isPoor,
        hasSpecialNeeds: n.hasSpecialNeeds,
        specialNeedsEnc: n.hasSpecialNeeds ? this.cipher.encryptNullable(n.specialNeeds) : null,
        ageGroup: current.ageGroupOverrideReason ? current.ageGroup : computeAgeGroup(n.birthDate, fy),
        source,
        sourceDate: today(),
        importBatchId: batch.id,
        approvalNote: null,
        ...initialApproval(user.role, user.id),
      });
    }
  }

  async applyHazards(rows: ValidatedRow[], batch: ImportBatchRow, user: SessionUser): Promise<void> {
    for (const r of rows) {
      if (r.outcome !== 'berubah' || !r.targetRecordId) continue;
      const mask = (r.normalized as unknown as { hazardMask: number }).hazardMask;
      await this.residents.update(r.targetRecordId, { hazardMask: mask, importBatchId: batch.id, approvalNote: null, ...initialApproval(user.role, user.id) });
    }
  }
}
