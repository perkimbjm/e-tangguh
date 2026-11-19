import { Injectable } from '@nestjs/common';
import { maskIdNumber, type ResidentDetail, type ResidentListItem } from '@etangguh/shared';
import { FieldCipher } from '../../../crypto/field-cipher';
import type { ResidentJoined } from './residents.repository';

/** Bentuk tampilan warga. Daftar hanya memuat NIK/KK tersamar; rincian mendekripsi kolom 🔒. */
@Injectable()
export class ResidentsMapper {
  constructor(private readonly cipher: FieldCipher) {}

  toListItem({ record: r, person: p, family: f, kelurahanName }: ResidentJoined): ResidentListItem {
    return {
      id: r.id,
      personId: p.id,
      fullName: p.fullName,
      gender: p.gender,
      birthDate: p.birthDate,
      nikMasked: maskIdNumber(p.nikLast4),
      kkMasked: maskIdNumber(f?.kkLast4),
      isFamilyHead: r.isFamilyHead,
      kelurahanId: r.kelurahanId,
      kelurahanName,
      rw: r.rw,
      rt: r.rt,
      ageGroup: r.ageGroup,
      hazardMask: r.hazardMask,
      isPoor: r.isPoor,
      hasSpecialNeeds: r.hasSpecialNeeds,
      isActive: r.isActive,
      approvalStatus: r.approvalStatus,
      approvalNote: r.approvalNote,
      rowVersion: r.rowVersion,
    };
  }

  toDetail(row: ResidentJoined): ResidentDetail {
    const { record: r, person: p, family: f } = row;
    return {
      ...this.toListItem(row),
      nik: this.cipher.decryptNullable(p.nikEnc),
      noNikReason: p.noNikReason,
      kk: f?.kkEnc ? this.cipher.decrypt(f.kkEnc) : null,
      birthPlace: p.birthPlace,
      address: this.cipher.decrypt(r.addressEnc),
      specialNeeds: this.cipher.decryptNullable(r.specialNeedsEnc),
      inactiveReason: r.inactiveReason,
      inactiveDate: r.inactiveDate,
      ageGroupOverrideReason: r.ageGroupOverrideReason,
      source: r.source,
      sourceDate: r.sourceDate,
    };
  }
}
