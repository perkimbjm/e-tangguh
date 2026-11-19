import { Injectable } from '@nestjs/common';
import { FORM_5A4, FORM_5A6, type RecapFormCode, type ReportData, buildForm5A3 } from '@etangguh/shared';
import { RecapService } from '../../recap/recap.service';

/** Data Form 5.A.3/5.A.4/5.A.6 dari layanan rekap (angka yang sama dengan layar rekap). */
@Injectable()
export class RecapProvider {
  constructor(private readonly recap: RecapService) {}

  async build(formCode: RecapFormCode, fiscalYearId: string, year: number, scope: string | null): Promise<ReportData> {
    const table = await this.recap.compute(formCode, fiscalYearId, year, scope);
    const def = formCode === '5.A.3' ? buildForm5A3((table.variations ?? []).map((v) => v.mask)) : formCode === '5.A.4' ? FORM_5A4 : FORM_5A6;
    const boldRows = new Set<number>();
    let no = 0;
    const rows = table.rows.map((r, i) => {
      if (r.kind !== 'data') boldRows.add(i);
      const out: ReportData['rows'][number] = { no: r.kind === 'data' ? ++no : null };
      if (formCode === '5.A.6') out.jenis = r.label;
      else {
        out.kecamatan = r.kind === 'total' ? 'JUMLAH KOTA' : (r.group ?? null);
        out.kelurahan = r.kind === 'data' ? r.label : r.kind === 'subtotal' ? 'Jumlah' : null;
      }
      for (const [key, cell] of Object.entries(r.cells)) out[key] = 'value' in cell ? cell.value : cell.text || null;
      return out;
    });
    return { def, year, rows, boldRows, notes: table.notes };
  }
}
