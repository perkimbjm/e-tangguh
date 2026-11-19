import { Injectable } from '@nestjs/common';
import { FORM_5A7, FORM_5A8, type ReportData, SUPPORT_KEYS } from '@etangguh/shared';
import { InventoryRepository, toDto } from '../../inventory/inventory.repository';

const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });

/** Form 5.A.7 (peralatan) dan 5.A.8 (stok logistik). Kondisi dicetak sebagai jumlah baik/rusak. */
@Injectable()
export class InventoryProvider {
  constructor(private readonly repo: InventoryRepository) {}

  async build(formCode: '5.A.7' | '5.A.8', fiscalYearId: string, year: number): Promise<ReportData> {
    const kind = formCode === '5.A.7' ? 'equipment' : 'logistics';
    const rows = (await this.repo.list(kind, fiscalYearId)).map(toDto) as Record<string, unknown>[];
    return {
      def: formCode === '5.A.7' ? FORM_5A7 : FORM_5A8,
      year,
      rows: rows.map((r, i) => {
        const out: ReportData['rows'][number] = {
          no: i + 1,
          name: r.name as string,
          quantityUnit: `${fmt(r.quantity as number)} ${r.unit as string}`,
          locationText: (r.locationText as string | null) ?? null,
          institution: (r.institution as string | null) ?? null,
          qtyGood: r.qtyGood as number,
          qtyBroken: r.qtyBroken as number,
        };
        if (formCode === '5.A.7') for (const k of SUPPORT_KEYS) out[k] = Boolean(r[k]);
        return out;
      }),
      notes: ['Kolom kondisi memuat jumlah dalam kondisi baik dan rusak.'],
    };
  }
}
