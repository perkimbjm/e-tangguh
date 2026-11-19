import { Injectable } from '@nestjs/common';
import { RECAP_FORM_CODES, type RecapFormCode, type ReportData, type SessionUser } from '@etangguh/shared';
import { zipSync } from 'fflate';
import { createHash } from 'node:crypto';
import { ApiException } from '../../../common/errors/api-exception';
import { KelurahanScope } from '../../../common/guards/kelurahan-scope';
import { AuditContext } from '../../audit/audit-context';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { Form5A1Provider } from './providers/form-5a1.provider';
import { Form5A2Provider } from './providers/form-5a2.provider';
import { Form5A5Provider } from './providers/form-5a5.provider';
import { EventsProvider } from './providers/events.provider';
import { RecapProvider } from './providers/recap.provider';
import { writePdf } from './pdf-writer';
import { writeXlsx } from './xlsx-writer';

export type ExportFormat = 'xlsx' | 'pdf';
export const EXPORT_FORM_CODES = ['5.A.1', '5.A.2', '5.A.3', '5.A.4', '5.A.5', '5.A.6', '5.A.9', '5.A.10', '5.A.11', '5.A.12'] as const;
const EVENT_FORMS = new Set(['5.A.9', '5.A.10', '5.A.11', '5.A.12']);
const PERSONAL_FORMS = new Set(['5.A.1', '5.A.2']);
const MIME: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export interface ExportFile {
  buffer: Buffer;
  filename: string;
  mime: string;
}

/** Satu mesin ekspor: XLSX dan PDF dari data dan definisi formulir yang sama (R7). */
@Injectable()
export class ExportsService {
  constructor(
    private readonly years: FiscalYearsService,
    private readonly f5a1: Form5A1Provider,
    private readonly f5a2: Form5A2Provider,
    private readonly f5a5: Form5A5Provider,
    private readonly events: EventsProvider,
    private readonly recap: RecapProvider,
  ) {}

  async data(formCode: string, fiscalYearId: string, year: number, kelurahanId: string | null, maskIds: boolean, eventId: string | null = null): Promise<ReportData> {
    if (EVENT_FORMS.has(formCode)) return this.events.build(formCode as '5.A.9', fiscalYearId, year, eventId);
    if (formCode === '5.A.1') return this.f5a1.build({ fiscalYearId, year, kelurahanId, maskIds });
    if (formCode === '5.A.2') return this.f5a2.build({ fiscalYearId, year, kelurahanId, maskIds });
    if (formCode === '5.A.5') return this.f5a5.build({ fiscalYearId, year, kelurahanId, maskIds });
    if ((RECAP_FORM_CODES as readonly string[]).includes(formCode)) return this.recap.build(formCode as RecapFormCode, fiscalYearId, year, kelurahanId);
    throw ApiException.notFound(`Ekspor Form ${formCode} belum tersedia`);
  }

  async render(data: ReportData, format: ExportFormat): Promise<Buffer> {
    return format === 'pdf' ? writePdf(data) : writeXlsx(data);
  }

  async exportOne(year: number, formCode: string, formatRaw: string, kelurahan: string | undefined, user: SessionUser, eventId?: string): Promise<ExportFile> {
    const format = formatRaw === 'pdf' ? 'pdf' : formatRaw === 'xlsx' || !formatRaw ? 'xlsx' : null;
    if (!format) throw ApiException.validation({ format: 'Format harus xlsx atau pdf' });
    const isPendata = user.role === 'pendata_kelurahan';
    // Pendata kelurahan hanya boleh 5.A.1/5.A.2 kelurahannya (contracts/api.md).
    if (isPendata && !PERSONAL_FORMS.has(formCode)) throw ApiException.forbidden('Pendata kelurahan hanya dapat mengekspor Form 5.A.1 dan 5.A.2');
    const scope = KelurahanScope.resolve(user, kelurahan || undefined);
    const fy = await this.years.get(year);
    if (eventId && !/^[0-9a-f-]{36}$/i.test(eventId)) throw ApiException.validation({ event: 'ID kejadian tidak sah' });
    const data = await this.data(formCode, fy.id, year, scope, isPendata, eventId ?? null);
    const buffer = await this.render(data, format);
    AuditContext.annotate({ entityId: formCode, detail: { year, format, kelurahanId: scope, eventId: eventId ?? null, rows: data.rows.length } });
    return { buffer, filename: `form-${formCode.replace(/\./g, '').toLowerCase()}-${year}${scope ? '-kel' : ''}.${format}`, mime: MIME[format] };
  }

  /** Paket seluruh Form 5.A yang tersedia (XLSX + PDF) dalam satu ZIP, dengan daftar sidik SHA-256. */
  async exportAll(year: number): Promise<ExportFile & { sha256: string }> {
    const fy = await this.years.get(year);
    const entries: Record<string, Uint8Array> = {};
    const manifest: string[] = [`Paket Form 5.A tahun anggaran ${year} — dibuat ${new Date().toISOString()}`, ''];
    for (const code of EXPORT_FORM_CODES) {
      const data = await this.data(code, fy.id, year, null, false);
      for (const format of ['xlsx', 'pdf'] as const) {
        const buf = await this.render(data, format);
        const name = `form-${code.replace(/\./g, '').toLowerCase()}-${year}.${format}`;
        entries[name] = buf;
        manifest.push(`${createHash('sha256').update(buf).digest('hex')}  ${name}`);
      }
    }
    entries['SHA256SUMS.txt'] = Buffer.from(manifest.join('\n') + '\n', 'utf8');
    const buffer = Buffer.from(zipSync(entries, { level: 6 }));
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    AuditContext.annotate({ entityId: `export-all-${year}`, detail: { year, files: Object.keys(entries).length, sha256 } });
    return { buffer, filename: `form-5a-${year}.zip`, mime: 'application/zip', sha256 };
  }
}
