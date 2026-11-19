import { Injectable } from '@nestjs/common';
import { RECAP_5A3, RECAP_FORM_CODES, RECAP_SPECS, type RecapFormCode, type RecapTable, type SessionUser, encodeCellKey } from '@etangguh/shared';
import { ApiException } from '../../../common/errors/api-exception';
import { KelurahanScope } from '../../../common/guards/kelurahan-scope';
import { and, count, eq } from 'drizzle-orm';
import { DbService } from '../../../db/db.module';
import { officerRecords } from '../../../db/schema';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { RecapContextLoader } from './recap-context';
import { collectMeasureCells, evaluateMeasures, resolveCell } from './recap-evaluator';

export function assertRecapForm(code: string): RecapFormCode {
  if (!(RECAP_FORM_CODES as readonly string[]).includes(code)) throw ApiException.notFound('Formulir rekap tidak dikenal (5.A.3, 5.A.4, 5.A.6)');
  return code as RecapFormCode;
}

/** Rekapitulasi dihitung saat diminta dari data rincian (Prinsip VII); tidak ada angka tersimpan. */
@Injectable()
export class RecapService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsService,
    private readonly contexts: RecapContextLoader,
  ) {}

  async table(year: number, formCodeRaw: string, user: SessionUser): Promise<RecapTable> {
    const formCode = assertRecapForm(formCodeRaw);
    const fy = await this.years.get(year);
    const scope = KelurahanScope.resolve(user);
    return this.compute(formCode, fy.id, year, scope);
  }

  async compute(formCode: RecapFormCode, fiscalYearId: string, year: number, scope: string | null): Promise<RecapTable> {
    const spec = RECAP_SPECS[formCode];
    const ctx = await this.contexts.load(fiscalYearId, scope);
    const columns = spec.columns(ctx);
    const rowDefs = spec.rows(ctx);
    const pairs = rowDefs.flatMap((r) => columns.map((c) => ({ rowKey: r.key, colKey: c.key })));
    const measured = await evaluateMeasures(this.db, collectMeasureCells(spec, ctx, pairs), fiscalYearId, scope);
    const memo = new Map<string, number>();
    const variations = formCode === '5.A.3' ? RECAP_5A3.variations(ctx) : undefined;

    const rows = rowDefs.map((r) => {
      const cells: RecapTable['rows'][number]['cells'] = {};
      for (const c of columns) {
        const def = spec.cell(r.key, c.key, ctx);
        if (def) {
          cells[c.key] = {
            cellKey: encodeCellKey(formCode, r.key, c.key),
            value: resolveCell(spec, ctx, r.key, c.key, measured, memo),
            ...(def.kind === 'measure' && def.pending ? { pending: def.pending } : {}),
          };
        } else {
          cells[c.key] = { text: '' };
        }
      }
      return { ...r, cells };
    });
    // Kolom teks "kelompok jenis" 5.A.3 diisi label variasi bila baris memiliki warga pada variasi itu.
    if (variations) {
      for (const row of rows) {
        for (const v of variations) {
          const jiwa = row.cells[`v:${v.mask}:jiwa`];
          row.cells[`v:${v.mask}:jenis`] = { text: jiwa && 'value' in jiwa && jiwa.value > 0 ? v.label : '' };
        }
      }
    }
    if (formCode === '5.A.4') await this.fillVolunteerNotes(rows, ctx, fiscalYearId, scope);
    const notes = ['Hanya data warga berstatus disetujui dan aktif yang dihitung.'];
    if (formCode === '5.A.4') {
      notes.push('Aparatur dihitung menurut kelurahan wilayah tugas. Kolom 14 memuat jumlah relawan (formulir tidak memiliki kolom relawan; tafsir penyusun, perlu dikonfirmasi BPBD).');
    }
    if (formCode === '5.A.6') notes.push('Kolom 11 mengikuti rumus kepala kolom formulir: kolom 4 + kolom 10 (perlu dikonfirmasi BPBD).');
    return { formCode, year, columns, rows, variations, notes };
  }

  /** Kolom 14 Form 5.A.4: "Relawan: n orang" = petugas berjabatan relawan di kelurahan tugas itu. */
  private async fillVolunteerNotes(rows: RecapTable['rows'], ctx: { kelurahan: { id: string; kecamatanId: string | null }[] }, fiscalYearId: string, scope: string | null) {
    const counts = await this.db
      .executor()
      .select({ kel: officerRecords.dutyKelurahanId, n: count() })
      .from(officerRecords)
      .where(and(eq(officerRecords.fiscalYearId, fiscalYearId), eq(officerRecords.position, 'relawan'), scope ? eq(officerRecords.dutyKelurahanId, scope) : undefined))
      .groupBy(officerRecords.dutyKelurahanId);
    const byKel = new Map(counts.map((c) => [c.kel, Number(c.n)]));
    for (const row of rows) {
      const kels =
        row.key === 'total' ? ctx.kelurahan : row.key.startsWith('kec:') ? ctx.kelurahan.filter((k) => `kec:${k.kecamatanId ?? 'tanpa'}` === row.key) : ctx.kelurahan.filter((k) => `kel:${k.id}` === row.key);
      const n = kels.reduce((a, k) => a + (byKel.get(k.id) ?? 0), 0);
      row.cells.c14 = { text: n > 0 ? `Relawan: ${n} orang` : '' };
    }
  }
}
