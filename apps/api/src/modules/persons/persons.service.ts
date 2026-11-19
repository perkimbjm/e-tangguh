import { Injectable } from '@nestjs/common';
import { isSixteenDigits, normalizeIdNumber } from '@etangguh/shared';
import { BlindIndex, last4 } from '../../crypto/blind-index';
import { FieldCipher } from '../../crypto/field-cipher';
import { ApiException } from '../../common/errors/api-exception';
import { type DuplicateCandidate, type FamilyRow, type PersonRow, PersonsRepository } from './persons.repository';

export interface PersonIdentity {
  fullName: string;
  gender: 'L' | 'P';
  birthPlace?: string | null;
  birthDate?: string | null;
}

export interface FindOrCreateResult {
  person: PersonRow;
  created: boolean;
}

function assertBirthDate(birthDate?: string | null): void {
  if (birthDate && birthDate > new Date().toISOString().slice(0, 10)) {
    throw ApiException.validation({ birthDate: 'Tanggal lahir tidak boleh di masa depan' });
  }
}

/** Satu catatan per orang (Prinsip III). Data diri diketik sekali dan dipakai semua modul. */
@Injectable()
export class PersonsService {
  constructor(
    private readonly repo: PersonsRepository,
    private readonly cipher: FieldCipher,
    private readonly blind: BlindIndex,
  ) {}

  nikHash(nik: string): Buffer {
    return this.blind.compute('nik', nik);
  }

  kkHash(kk: string): Buffer {
    return this.blind.compute('kk', kk);
  }

  async findByNik(nikRaw: string): Promise<PersonRow | null> {
    const nik = normalizeIdNumber(nikRaw);
    if (!isSixteenDigits(nik)) return null;
    const found = await this.repo.findByNikHash(this.nikHash(nik));
    return found?.mergedIntoId ? this.repo.findById(found.mergedIntoId) : found;
  }

  /** Mencari orang lewat `nik_hash`; membuat baru bila belum ada. Data diri lama tidak ditimpa. */
  async findOrCreateByNik(nikRaw: string, identity: PersonIdentity, createdBy?: string): Promise<FindOrCreateResult> {
    const nik = normalizeIdNumber(nikRaw);
    if (!isSixteenDigits(nik)) throw ApiException.validation({ nik: 'NIK harus 16 digit' });
    const existing = await this.findByNik(nik);
    if (existing) return { person: existing, created: false };
    assertBirthDate(identity.birthDate);
    const person = await this.repo.insert({
      nikEnc: this.cipher.encrypt(nik),
      nikHash: this.nikHash(nik),
      nikLast4: last4(nik),
      fullName: identity.fullName.trim(),
      gender: identity.gender,
      birthPlace: identity.birthPlace?.trim() || null,
      birthDate: identity.birthDate ?? null,
      createdBy,
    });
    return { person, created: true };
  }

  /** Orang tanpa NIK: alasan wajib; mengembalikan kandidat ganda untuk ditinjau operator. */
  async createWithoutNik(
    identity: PersonIdentity,
    reason: string,
    createdBy?: string,
  ): Promise<{ person: PersonRow; duplicateCandidates: DuplicateCandidate[] }> {
    if (!reason.trim()) throw ApiException.validation({ noNikReason: 'Alasan NIK belum ada wajib diisi' });
    assertBirthDate(identity.birthDate);
    const candidates = await this.repo.findDuplicateCandidates(identity.fullName, identity.birthDate ?? null);
    const person = await this.repo.insert({
      noNikReason: reason.trim(),
      fullName: identity.fullName.trim(),
      gender: identity.gender,
      birthPlace: identity.birthPlace?.trim() || null,
      birthDate: identity.birthDate ?? null,
      createdBy,
    });
    return { person, duplicateCandidates: candidates };
  }

  /** Mencari keluarga lewat `kk_hash`; membuat baru bila belum ada. */
  async findOrCreateFamily(kkRaw: string, headPersonId?: string, createdBy?: string): Promise<{ family: FamilyRow; created: boolean }> {
    const kk = normalizeIdNumber(kkRaw);
    if (!isSixteenDigits(kk)) throw ApiException.validation({ kk: 'Nomor KK harus 16 digit' });
    const hash = this.kkHash(kk);
    const existing = await this.repo.findFamilyByHash(hash);
    if (existing) {
      if (headPersonId && !existing.headPersonId) await this.repo.setFamilyHead(existing.id, headPersonId);
      return { family: existing, created: false };
    }
    const family = await this.repo.insertFamily({
      kkEnc: this.cipher.encrypt(kk),
      kkHash: hash,
      kkLast4: last4(kk),
      headPersonId: headPersonId ?? null,
      createdBy,
    });
    return { family, created: true };
  }

  decryptNik(person: Pick<PersonRow, 'nikEnc'>): string | null {
    return this.cipher.decryptNullable(person.nikEnc);
  }

  decryptKk(family: Pick<FamilyRow, 'kkEnc'>): string {
    return this.cipher.decrypt(family.kkEnc);
  }
}
