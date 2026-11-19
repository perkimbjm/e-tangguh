import { Injectable } from '@nestjs/common';
import {
  AFFECTED_STATUSES,
  EMPLOYMENT_STATUSES,
  FORM_5A9,
  FORM_5A10,
  FORM_5A11,
  FORM_5A12,
  type FormDefinition,
  type ReportData,
  emergencyStatus,
  formatDateId,
  isVulnerableAge,
} from '@etangguh/shared';
import { FieldCipher } from '../../../../crypto/field-cipher';
import { EventPeopleQuery } from './event-people.query';
import { dateWita, reportTimeWita, timeWita } from './event-format';

type Row = ReportData['rows'][number];
type EventRow = Awaited<ReturnType<EventPeopleQuery['events']>>[number];

/** Form 5.A.9-5.A.12 dari kejadian. Tanpa `eventId`, seluruh kejadian tahun itu dengan baris pemisah. */
@Injectable()
export class EventsProvider {
  constructor(
    private readonly q: EventPeopleQuery,
    private readonly cipher: FieldCipher,
  ) {}

  async build(formCode: '5.A.9' | '5.A.10' | '5.A.11' | '5.A.12', fiscalYearId: string, year: number, eventId: string | null): Promise<ReportData> {
    const events = await this.q.events(fiscalYearId, eventId);
    if (formCode === '5.A.12') return { def: FORM_5A12, year, rows: events.map((e, i) => this.eventRow(e, i + 1)) };
    const def: FormDefinition = formCode === '5.A.9' ? FORM_5A9 : formCode === '5.A.10' ? FORM_5A10 : FORM_5A11;
    const rows: Row[] = [];
    const boldRows = new Set<number>();
    for (const e of events) {
      const body = formCode === '5.A.11' ? await this.officerRows(fiscalYearId, e.id) : await this.affectedRows(formCode, fiscalYearId, e.id);
      if (!eventId) {
        boldRows.add(rows.length);
        rows.push({ fullName: `Kejadian: ${e.name} (${dateWita(e.occurredAt)})` });
      }
      rows.push(...body.map((r, i) => ({ ...r, no: i + 1 })));
    }
    const notes = formCode === '5.A.10' ? ['Susunan kolom 8-12 mengikuti templat resmi (kelompok "KORBAN" dan "PENGUNGSI").'] : undefined;
    return { def, year, rows, boldRows, notes };
  }

  private eventRow(e: EventRow, no: number): Row {
    const em = emergencyStatus(e.reportedAt, e.emergencyDeclaredAt);
    return {
      no,
      name: e.name,
      date: dateWita(e.occurredAt),
      time: timeWita(e.occurredAt),
      reportTime: reportTimeWita(e.reportedAt, e.occurredAt),
      location: e.locationText,
      em_tidak: em === 'tidak_dikeluarkan',
      em_kurang: em === 'kurang_24_jam',
      em_lebih: em === 'lebih_24_jam',
    };
  }

  private personBase(x: Awaited<ReturnType<EventPeopleQuery['affected']>>[number] | Awaited<ReturnType<EventPeopleQuery['officers']>>[number]): Row {
    return {
      fullName: x.fullName,
      nik: this.cipher.decryptNullable(x.nikEnc),
      kk: x.kkEnc ? this.cipher.decrypt(x.kkEnc) : null,
      gender: x.gender,
      birthPlace: x.birthPlace,
      birthDate: x.birthDate ? formatDateId(x.birthDate) : null,
      address: x.r ? this.cipher.decrypt(x.r.addressEnc) : null,
      kelurahan: x.kel,
      kecamatan: x.kecName,
    };
  }

  private async affectedRows(formCode: '5.A.9' | '5.A.10', fiscalYearId: string, eventId: string): Promise<Row[]> {
    const list = await this.q.affected(fiscalYearId, eventId);
    return list.map((x) => {
      const base = this.personBase(x);
      if (formCode === '5.A.9') {
        return {
          ...base,
          economy: x.r ? (x.r.isPoor ? 'miskin' : 'tidak miskin') : null,
          specialNeedsFlag: x.r ? (x.r.hasSpecialNeeds ? 'ya' : 'tidak') : null,
          specialNeeds: x.r ? this.cipher.decryptNullable(x.r.specialNeedsEnc) : null,
          vulnerableAge: x.r ? isVulnerableAge(x.r.ageGroup) : null,
        };
      }
      const row: Row = {
        ...base,
        roleResident: Boolean(x.r),
        roleApparatus: x.officer ? x.officer.employmentStatus !== 'non_aparatur' : false,
        roleTrcKlb: x.officer?.isTrcKlb ?? false,
        roleTrcPdb: x.officer?.isTrcPdb ?? false,
        rolePpe: x.officer?.isPpe ?? false,
        roleOps: x.officer?.isOps ?? false,
      };
      for (const s of AFFECTED_STATUSES) row[`st_${s}`] = x.a.status === s;
      return row;
    });
  }

  private async officerRows(fiscalYearId: string, eventId: string): Promise<Row[]> {
    const list = await this.q.officers(fiscalYearId, eventId);
    return list.map((x) => {
      const row: Row = {
        ...this.personBase(x),
        certifications: x.officer?.certifications ?? null,
        isTrcKlb: x.eo.isTrcKlb,
        isTrcPdb: x.eo.isTrcPdb,
        isPpe: x.eo.isPpe,
        isOps: x.eo.isOps,
        post_posko: x.eo.postType === 'posko',
        post_lapangan_kec: x.eo.postType === 'pos_lapangan' ? x.postKec : null,
        post_lapangan_kel: x.eo.postType === 'pos_lapangan' ? x.postKel : null,
      };
      for (const s of EMPLOYMENT_STATUSES) row[`st_${s}`] = x.officer?.employmentStatus === s;
      return row;
    });
  }
}
