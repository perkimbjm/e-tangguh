import { Injectable } from '@nestjs/common';
import {
  DEFAULT_ID_CARD_SETTINGS,
  EMPLOYMENT_LABEL,
  HAZARDS,
  type IdCardDto,
  type IdCardSettings,
  type IdCardVerification,
  POSITION_LABEL,
  type SessionUser,
  formatCardNumber,
  idCardSettingsSchema,
} from '@etangguh/shared';
import { and, eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { ApiException } from '../../../common/errors/api-exception';
import { DbService } from '../../../db/db.module';
import { appSettings, fiscalYears, officerRecords, persons, regions } from '../../../db/schema';
import { AuditContext } from '../../audit/audit-context';
import { FilesService } from '../../files/files.service';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';

const SETTINGS_KEY = 'id_card';
const PHOTO_MAX = 2 * 1024 * 1024;
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** Kode verifikasi acak 8 karakter (Crockford base32, ±40 bit). */
export function newCardCode(): string {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % 32]).join('');
}

const initials = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

/** Kartu identitas virtual petugas/relawan binaan BPBD, beserta verifikasi publiknya. */
@Injectable()
export class IdCardService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsService,
    private readonly files: FilesService,
  ) {}

  async settings(): Promise<IdCardSettings> {
    const [row] = await this.db
      .executor()
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, SETTINGS_KEY))
      .limit(1);
    const parsed = idCardSettingsSchema.safeParse(row?.value ?? {});
    return parsed.success ? parsed.data : DEFAULT_ID_CARD_SETTINGS;
  }

  async saveSettings(input: IdCardSettings, user: SessionUser): Promise<IdCardSettings> {
    await this.db
      .executor()
      .insert(appSettings)
      .values({ key: SETTINGS_KEY, value: input, updatedBy: user.id })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: input, updatedBy: user.id } });
    AuditContext.annotate({ entityId: SETTINGS_KEY, detail: { fields: Object.keys(input) } });
    return input;
  }

  private async officer(year: number, id: string) {
    const fy = await this.years.get(year);
    const [row] = await this.db
      .executor()
      .select({ o: officerRecords, fullName: persons.fullName, duty: regions.name })
      .from(officerRecords)
      .innerJoin(persons, eq(persons.id, officerRecords.personId))
      .leftJoin(regions, eq(regions.id, officerRecords.dutyKelurahanId))
      .where(and(eq(officerRecords.fiscalYearId, fy.id), eq(officerRecords.id, id)))
      .limit(1);
    if (!row) throw ApiException.notFound('Petugas tidak ditemukan');
    return { fy, ...row };
  }

  async card(year: number, id: string): Promise<IdCardDto> {
    const { fy, o, fullName, duty } = await this.officer(year, id);
    let code = o.cardCode;
    let issuedAt = o.cardIssuedAt;
    if (!code) {
      if (fy.status === 'final') throw ApiException.yearLocked(year);
      code = newCardCode();
      issuedAt = new Date();
      await this.db
        .executor()
        .update(officerRecords)
        .set({ cardCode: code, cardIssuedAt: issuedAt })
        .where(eq(officerRecords.id, id));
    }
    AuditContext.annotate({
      entityId: id,
      detail: { cardNumber: formatCardNumber(fy.year, code) },
    });
    return {
      officerId: o.id,
      category: o.position === 'relawan' ? 'relawan' : 'petugas',
      fullName,
      initials: initials(fullName),
      positionLabel: POSITION_LABEL[o.position],
      employmentLabel: EMPLOYMENT_LABEL[o.employmentStatus],
      dutyKelurahanName: duty,
      duties: [
        o.isTrcPdb && 'TRC PDB',
        o.isTrcKlb && 'TRC KLB',
        o.isPpe && 'PPE',
        o.isOps && 'Operasi',
      ].filter((x): x is string => Boolean(x)),
      hazards: HAZARDS.filter((h) => (o.hazardMask & (1 << h.bit)) !== 0).map((h) => h.name),
      certifications: (o.certifications ?? '')
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      year: fy.year,
      validUntil: `${fy.year}-12-31`,
      cardCode: code,
      cardNumber: formatCardNumber(fy.year, code),
      issuedAt: (issuedAt ?? new Date()).toISOString(),
      hasPhoto: Boolean(o.photoFileId),
      settings: await this.settings(),
    };
  }

  async setPhoto(
    year: number,
    id: string,
    data: Buffer | undefined,
    user: SessionUser,
  ): Promise<{ hasPhoto: true }> {
    const { fy, o } = await this.officer(year, id);
    if (fy.status === 'final') throw ApiException.yearLocked(year);
    if (!data?.length) throw ApiException.validation({ photo: 'Pilih foto' });
    const file = await this.files.save({
      data,
      kind: 'foto',
      ownerUserId: user.id,
      allowed: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: PHOTO_MAX,
    });
    await this.db
      .executor()
      .update(officerRecords)
      .set({ photoFileId: file.id })
      .where(eq(officerRecords.id, id));
    AuditContext.annotate({ entityId: id, detail: { photoSize: file.size } });
    // Foto lama yang tidak lagi dirujuk tahun anggaran mana pun dihapus.
    if (o.photoFileId) await this.removeIfUnused(o.photoFileId);
    return { hasPhoto: true };
  }

  async removePhoto(year: number, id: string): Promise<void> {
    const { fy, o } = await this.officer(year, id);
    if (fy.status === 'final') throw ApiException.yearLocked(year);
    if (!o.photoFileId) return;
    await this.db
      .executor()
      .update(officerRecords)
      .set({ photoFileId: null })
      .where(eq(officerRecords.id, id));
    await this.removeIfUnused(o.photoFileId);
  }

  private async removeIfUnused(fileId: string): Promise<void> {
    const [used] = await this.db
      .executor()
      .select({ id: officerRecords.id })
      .from(officerRecords)
      .where(eq(officerRecords.photoFileId, fileId))
      .limit(1);
    if (used) return;
    const file = await this.files.get(fileId).catch(() => null);
    if (file) await this.files.remove(file);
  }

  async photo(year: number, id: string): Promise<{ data: Buffer; mime: string }> {
    const { o } = await this.officer(year, id);
    if (!o.photoFileId) throw ApiException.notFound('Belum ada foto');
    const file = await this.files.get(o.photoFileId);
    return { data: await this.files.read(file), mime: file.mime };
  }

  /** Verifikasi publik lewat QR: hanya nama, jabatan, kelurahan tugas, dan status berlaku. */
  async verify(code: string): Promise<IdCardVerification> {
    const clean = code.toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(clean))
      throw ApiException.notFound('Kartu tidak ditemukan');
    const [row] = await this.db
      .executor()
      .select({
        position: officerRecords.position,
        fullName: persons.fullName,
        duty: regions.name,
        year: fiscalYears.year,
      })
      .from(officerRecords)
      .innerJoin(persons, eq(persons.id, officerRecords.personId))
      .innerJoin(fiscalYears, eq(fiscalYears.id, officerRecords.fiscalYearId))
      .leftJoin(regions, eq(regions.id, officerRecords.dutyKelurahanId))
      .where(eq(officerRecords.cardCode, clean))
      .limit(1);
    if (!row) throw ApiException.notFound('Kartu tidak ditemukan atau sudah dicabut');
    const currentYear = Number(
      new Intl.DateTimeFormat('en', { timeZone: 'Asia/Makassar', year: 'numeric' }).format(
        new Date(),
      ),
    );
    const valid = row.year >= currentYear;
    return {
      valid,
      status: valid ? 'berlaku' : 'kedaluwarsa',
      category: row.position === 'relawan' ? 'relawan' : 'petugas',
      fullName: row.fullName,
      positionLabel: POSITION_LABEL[row.position],
      dutyKelurahanName: row.duty,
      year: row.year,
      validUntil: `${row.year}-12-31`,
      cardNumber: formatCardNumber(row.year, clean),
      agencyName: (await this.settings()).agencyName,
    };
  }
}
