import { Injectable } from '@nestjs/common';
import type { SessionUser } from '@etangguh/shared';
import { ApiException } from '../../../common/errors/api-exception';
import { AuditContext } from '../../audit/audit-context';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { type InventoryKind, InventoryRepository, toDto } from './inventory.repository';

const LABEL: Record<InventoryKind, string> = {
  equipment: 'Peralatan',
  logistics: 'Barang logistik',
};

/** Inventaris peralatan (5.A.7) dan stok logistik (5.A.8) per tahun anggaran. */
@Injectable()
export class InventoryService {
  constructor(
    private readonly repo: InventoryRepository,
    private readonly years: FiscalYearsService,
  ) {}

  async list(kind: InventoryKind, year: number) {
    const fy = await this.years.get(year);
    return (await this.repo.list(kind, fy.id)).map(toDto);
  }

  private assertQty(v: { quantity: number; qtyGood: number; qtyBroken: number }) {
    if (v.qtyGood + v.qtyBroken > v.quantity)
      throw ApiException.validation({ qtyGood: 'Jumlah baik + rusak melebihi jumlah tersedia' });
  }

  async create(
    kind: InventoryKind,
    year: number,
    input: Record<string, unknown> & { quantity: number; qtyGood: number; qtyBroken: number },
    user: SessionUser,
  ) {
    const fy = await this.years.assertWritable(year);
    this.assertQty(input);
    const row = await this.repo.insert(kind, { ...input, fiscalYearId: fy.id, createdBy: user.id });
    AuditContext.annotate({ entityId: row.id });
    return toDto(row);
  }

  async update(kind: InventoryKind, year: number, id: string, input: Record<string, unknown>) {
    const fy = await this.years.assertWritable(year);
    const current = await this.repo.find(kind, fy.id, id);
    if (!current) throw ApiException.notFound(`${LABEL[kind]} tidak ditemukan`);
    const merged = {
      ...(toDto(current) as { quantity: number; qtyGood: number; qtyBroken: number }),
      ...input,
    } as { quantity: number; qtyGood: number; qtyBroken: number };
    this.assertQty(merged);
    AuditContext.annotate({ detail: { fields: Object.keys(input) } });
    return toDto(await this.repo.update(kind, id, input));
  }

  async remove(kind: InventoryKind, year: number, id: string): Promise<void> {
    const fy = await this.years.assertWritable(year);
    if (!(await this.repo.find(kind, fy.id, id)))
      throw ApiException.notFound(`${LABEL[kind]} tidak ditemukan`);
    await this.repo.delete(kind, id);
  }
}
