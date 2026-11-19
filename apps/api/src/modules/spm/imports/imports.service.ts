import { Injectable } from '@nestjs/common';
import {
  IMPORT_FORM_CODES,
  IMPORT_MAX_BYTES,
  type CellValue,
  type ImportFormCode,
  type ImportPreview,
  type RegionChoice,
  type RegionMappingRequest,
  type SessionUser,
  getFormDefinition,
} from '@etangguh/shared';
import { createHash } from 'node:crypto';
import { ApiException } from '../../../common/errors/api-exception';
import { FieldCipher } from '../../../crypto/field-cipher';
import { AuditContext } from '../../audit/audit-context';
import { FilesService } from '../../files/files.service';
import { RegionsRepository, normalizeRegionName } from '../../regions/regions.repository';
import type { FiscalYearRow } from '../fiscal-years/fiscal-years.repository';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { HazardImportValidator } from './hazard-import.validator';
import { ImportApply } from './import-apply';
import { ImportCleanup } from './import-cleanup';
import { ImportValidator, type ValidationResult } from './import-validator';
import { type ImportBatchRow, ImportsRepository } from './imports.repository';
import { jsonSafe, sealRow, unsealRow } from './row-seal';
import { readFormSheet } from './xlsx-reader';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const;
const PREVIEW_ERROR_LIMIT = 500;

@Injectable()
export class ImportsService {
  constructor(
    private readonly repo: ImportsRepository,
    private readonly years: FiscalYearsService,
    private readonly files: FilesService,
    private readonly regions: RegionsRepository,
    private readonly validator: ImportValidator,
    private readonly hazardValidator: HazardImportValidator,
    private readonly apply: ImportApply,
    private readonly cleanup: ImportCleanup,
    private readonly cipher: FieldCipher,
  ) {}

  private formCode(code: string): ImportFormCode {
    if (!(IMPORT_FORM_CODES as readonly string[]).includes(code)) throw ApiException.validation({ formCode: 'Formulir impor harus 5.A.1 atau 5.A.2' });
    return code as ImportFormCode;
  }

  private runValidation(formCode: ImportFormCode, rows: { rowNumber: number; values: Record<string, CellValue> }[], fy: FiscalYearRow, user: SessionUser, choices: RegionChoice[]) {
    return formCode === '5.A.1' ? this.validator.validateResidents(rows, fy, user, choices) : this.hazardValidator.validate(rows, fy, user);
  }

  private counts(result: ValidationResult) {
    const c = { rowsNew: 0, rowsChanged: 0, rowsUnchanged: 0, rowsRejected: 0 };
    for (const r of result.rows) {
      if (r.outcome === 'baru') c.rowsNew++;
      else if (r.outcome === 'berubah') c.rowsChanged++;
      else if (r.outcome === 'sama') c.rowsUnchanged++;
      else c.rowsRejected++;
    }
    return { ...c, rowsTotal: result.rows.length };
  }

  private async storeResult(batchId: string, result: ValidationResult): Promise<void> {
    await this.repo.replaceRows(
      batchId,
      result.rows.map((r) => ({
        rowNumber: r.rowNumber,
        raw: sealRow(this.cipher, jsonSafe(r.raw)),
        normalized: r.normalized ? sealRow(this.cipher, { ...r.normalized, _personId: r.existingPersonId }) : null,
        errors: r.errors,
        outcome: r.outcome,
        targetId: r.targetRecordId,
      })),
    );
  }

  async upload(year: number, formCodeRaw: string, file: { buffer: Buffer; originalname?: string } | undefined, sheetName: string | undefined, user: SessionUser): Promise<ImportPreview> {
    const formCode = this.formCode(formCodeRaw);
    const fy = await this.years.assertWritable(year);
    if (!file?.buffer?.length) throw ApiException.validation({ file: 'Pilih berkas .xlsx' });
    const stored = await this.files.save({ data: file.buffer, kind: 'impor', ownerUserId: user.id, allowed: [XLSX], maxBytes: IMPORT_MAX_BYTES });
    const sheet = await readFormSheet(file.buffer, getFormDefinition(formCode)!, sheetName || undefined);
    if (sheet.year && sheet.year !== year) {
      throw ApiException.validation({ file: `Berkas untuk tahun anggaran ${sheet.year}, bukan ${year}` }, 'Tahun anggaran berkas tidak sesuai');
    }
    const sha = createHash('sha256').update(file.buffer).digest('hex');
    const result = await this.runValidation(formCode, sheet.rows, fy, user, []);
    const warnings = [...result.warnings];
    if (await this.repo.confirmedWithSha(fy.id, sha)) warnings.unshift('Berkas yang sama persis pernah dikonfirmasi sebelumnya');

    const batch = await this.repo.insertBatch({
      fiscalYearId: fy.id,
      formCode,
      kelurahanId: user.role === 'pendata_kelurahan' ? user.kelurahanId : null,
      fileId: stored.id,
      fileSha256: sha,
      originalName: file.originalname?.slice(0, 200) ?? null,
      uploadedBy: user.id,
      regionChoices: result.regionChoices,
      warnings,
      ...this.counts(result),
    });
    await this.storeResult(batch.id, result);
    AuditContext.annotate({ entityId: batch.id, detail: { formCode, ...this.counts(result) } });
    return this.preview(batch);
  }

  private async loadBatch(year: number, id: string, user: SessionUser, forWrite: boolean): Promise<{ fy: FiscalYearRow; batch: ImportBatchRow }> {
    const fy = forWrite ? await this.years.assertWritable(year) : await this.years.get(year);
    const batch = await this.repo.findBatch(fy.id, id, forWrite);
    if (!batch) throw ApiException.notFound('Berkas impor tidak ditemukan');
    if (user.role === 'pendata_kelurahan' && batch.uploadedBy !== user.id) throw ApiException.forbidden();
    if (forWrite && batch.status !== 'divalidasi') {
      throw ApiException.conflict('IMPOR_SUDAH_DIPROSES', `Berkas impor sudah ${batch.status}`);
    }
    return { fy, batch };
  }

  async preview(batch: ImportBatchRow): Promise<ImportPreview> {
    const rejected = await this.repo.rejectedRows(batch.id, PREVIEW_ERROR_LIMIT + 1);
    return {
      id: batch.id,
      formCode: batch.formCode as ImportFormCode,
      status: batch.status,
      rowsTotal: batch.rowsTotal,
      rowsNew: batch.rowsNew,
      rowsChanged: batch.rowsChanged,
      rowsUnchanged: batch.rowsUnchanged,
      rowsRejected: batch.rowsRejected,
      regionChoices: batch.regionChoices,
      warnings: batch.warnings,
      errors: rejected.slice(0, PREVIEW_ERROR_LIMIT),
      errorsTruncated: rejected.length > PREVIEW_ERROR_LIMIT,
    };
  }

  async get(year: number, id: string, user: SessionUser): Promise<ImportPreview> {
    return this.preview((await this.loadBatch(year, id, user, false)).batch);
  }

  async errorRows(year: number, id: string, user: SessionUser) {
    const { batch } = await this.loadBatch(year, id, user, false);
    return this.repo.rejectedRows(batch.id);
  }

  /** Validasi ulang dari nilai mentah tersimpan (setelah memilih padanan wilayah, atau saat konfirmasi). */
  private async revalidate(fy: FiscalYearRow, batch: ImportBatchRow, user: SessionUser, choices: RegionChoice[]) {
    if (batch.purgedAt) throw ApiException.conflict('IMPOR_KEDALUWARSA', 'Data mentah berkas sudah dihapus; unggah ulang berkas');
    const stored = await this.repo.listRows(batch.id);
    const rows = stored.map((r) => ({ rowNumber: r.rowNumber, values: unsealRow(this.cipher, r.raw) as Record<string, CellValue> }));
    const uploader = { ...user, ...(batch.kelurahanId ? { role: 'pendata_kelurahan' as const, kelurahanId: batch.kelurahanId } : {}) };
    const result = await this.runValidation(batch.formCode as ImportFormCode, rows, fy, uploader, choices);
    await this.storeResult(batch.id, result);
    const updated = await this.repo.updateBatch(batch.id, { regionChoices: result.regionChoices, ...this.counts(result) });
    return { result, updated };
  }

  async mapRegions(year: number, id: string, input: RegionMappingRequest, user: SessionUser): Promise<ImportPreview> {
    const { fy, batch } = await this.loadBatch(year, id, user, true);
    const choices = batch.regionChoices.map((c) => ({ ...c }));
    for (const m of input.mappings) {
      const choice = choices.find((c) => normalizeRegionName(c.spelling) === normalizeRegionName(m.spelling));
      if (!choice) throw ApiException.validation({ mappings: `Ejaan "${m.spelling}" tidak ada pada berkas ini` });
      const region = await this.regions.findById(m.regionId);
      if (region?.level !== 'kelurahan') throw ApiException.validation({ mappings: 'Kelurahan tidak ditemukan' });
      if (!choice.candidates.some((c) => c.id === region.id)) choice.candidates.push({ id: region.id, name: region.name, score: 0 });
      choice.chosenId = region.id;
    }
    const { updated } = await this.revalidate(fy, batch, user, choices);
    return this.preview(updated);
  }

  async confirm(year: number, id: string, user: SessionUser): Promise<ImportPreview> {
    const { fy, batch } = await this.loadBatch(year, id, user, true);
    const { result } = await this.revalidate(fy, batch, user, batch.regionChoices);
    const stored = await this.repo.listRows(batch.id);
    const idByRow = new Map(stored.map((s) => [s.rowNumber, s.id]));
    const withIds = result.rows.map((r) => ({ ...r, id: idByRow.get(r.rowNumber)! }));
    if (batch.formCode === '5.A.1') await this.apply.applyResidents(withIds, batch, fy, user);
    else await this.apply.applyHazards(result.rows, batch, user);
    await this.cleanup.purgeBatch(batch.id, batch.fileId);
    const done = await this.repo.updateBatch(batch.id, { status: 'dikonfirmasi', confirmedAt: new Date() });
    AuditContext.annotate({ entityId: batch.id, detail: { formCode: batch.formCode, ...this.counts(result) } });
    return this.preview(done);
  }

  async cancel(year: number, id: string, user: SessionUser): Promise<ImportPreview> {
    const { batch } = await this.loadBatch(year, id, user, true);
    await this.cleanup.purgeBatch(batch.id, batch.fileId);
    const done = await this.repo.updateBatch(batch.id, { status: 'dibatalkan' });
    AuditContext.annotate({ entityId: batch.id });
    return this.preview(done);
  }
}
