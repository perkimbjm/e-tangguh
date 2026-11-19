import { Injectable } from '@nestjs/common';
import {
  type CellDefinition,
  type DrillResult,
  type DrillRow,
  type MeasureCell,
  RECAP_SPECS,
  type RecapContext,
  type SessionUser,
  EMPLOYMENT_LABEL,
  POSITION_LABEL,
  decodeCellKey,
  maskIdNumber,
} from '@etangguh/shared';
import { and, asc, eq, sql } from 'drizzle-orm';
import { ApiException } from '../../../common/errors/api-exception';
import { KelurahanScope } from '../../../common/guards/kelurahan-scope';
import { DbService } from '../../../db/db.module';
import { families, hazardZones, officerRecords, persons, regions, residentRecords } from '../../../db/schema';
import { AuditContext } from '../../audit/audit-context';
import { FiscalYearsService } from '../fiscal-years/fiscal-years.service';
import { RecapContextLoader } from './recap-context';
import { compileOfficerFilter, compileResidentFilter, compileZoneFilter, officerBase, residentBase, zoneBase } from './recap-query.builder';

const LIMIT = 2000;

/** Penelusuran angka rekap ke baris penyusunnya, memakai definisi sel yang sama dengan angkanya. */
@Injectable()
export class RecapDrilldownService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsService,
    private readonly contexts: RecapContextLoader,
  ) {}

  async drill(year: number, formCodeRaw: string, cellKey: string, user: SessionUser): Promise<DrillResult> {
    const decoded = decodeCellKey(cellKey);
    if (!decoded || decoded.formCode !== formCodeRaw) throw ApiException.notFound('Sel rekap tidak dikenal');
    const fy = await this.years.get(year);
    const scope = KelurahanScope.resolve(user);
    if (scope && decoded.rowKey.startsWith('kel:') && decoded.rowKey.slice(4) !== scope) throw ApiException.forbidden('Anda hanya dapat menelusuri kelurahan Anda');
    const ctx = await this.contexts.load(fy.id, scope);
    const spec = RECAP_SPECS[decoded.formCode];
    const def = spec.cell(decoded.rowKey, decoded.colKey, ctx);
    if (!def) throw ApiException.notFound('Sel ini bukan angka');
    // Daftar petugas hanya untuk peran BPBD (data-model.md, tabel visibilitas).
    if (scope && this.involvesOfficers(def, ctx)) throw ApiException.forbidden('Daftar petugas hanya dapat dibuka peran BPBD');

    const rows: DrillRow[] = [];
    const total = await this.collect(def, ctx, fy.id, scope, rows, undefined);
    AuditContext.annotate({ entityId: cellKey, detail: { formCode: decoded.formCode, value: total } });
    return { cellKey, value: total, measure: def.kind === 'sum' ? 'sum' : def.measure, rows: rows.slice(0, LIMIT), truncated: rows.length > LIMIT };
  }

  private async collect(def: CellDefinition, ctx: RecapContext, fyId: string, scope: string | null, out: DrillRow[], component?: string): Promise<number> {
    if (def.kind === 'sum') {
      let total = 0;
      for (const p of def.parts) {
        const part = RECAP_SPECS[def.formCode].cell(p.rowKey, p.colKey, ctx);
        if (part) total += await this.collect(part, ctx, fyId, scope, out, this.componentLabel(p.rowKey, p.colKey, ctx));
      }
      return total;
    }
    const rows = await this.measureRows(def, fyId, scope);
    for (const r of rows) out.push(component ? { ...r, component } : r);
    return rows.length;
  }

  private involvesOfficers(def: CellDefinition, ctx: RecapContext): boolean {
    if (def.kind === 'measure') return def.measure === 'officers';
    return def.parts.some((p) => {
      const part = RECAP_SPECS[def.formCode].cell(p.rowKey, p.colKey, ctx);
      return part ? this.involvesOfficers(part, ctx) : false;
    });
  }

  private componentLabel(rowKey: string, colKey: string, ctx: RecapContext): string {
    const kel = rowKey.startsWith('kel:') ? ctx.kelurahan.find((k) => `kel:${k.id}` === rowKey)?.name : undefined;
    return [kel, colKey].filter(Boolean).join(' · ');
  }

  private async measureRows(def: MeasureCell, fyId: string, scope: string | null): Promise<DrillRow[]> {
    const db = this.db.executor();
    const where = and(residentBase(fyId, scope), compileResidentFilter(def.filter));
    switch (def.measure) {
      case 'persons': {
        const rows = await db
          .select({ id: residentRecords.id, name: persons.fullName, last4: persons.nikLast4, kel: regions.name, rw: residentRecords.rw, rt: residentRecords.rt })
          .from(residentRecords)
          .innerJoin(persons, eq(persons.id, residentRecords.personId))
          .innerJoin(regions, eq(regions.id, residentRecords.kelurahanId))
          .where(where)
          .orderBy(asc(persons.fullName));
        return rows.map((r) => ({ key: r.id, label: r.name, detail: `NIK ${maskIdNumber(r.last4) ?? 'belum ada'} · ${r.kel} · RW ${r.rw}/RT ${r.rt ?? '-'}` }));
      }
      case 'families': {
        const rows = await db
          .select({
            familyId: residentRecords.familyId,
            last4: families.kkLast4,
            members: sql<number>`count(*)`,
            head: sql<string | null>`max(CASE WHEN ${residentRecords.isFamilyHead} THEN ${persons.fullName} END)`,
          })
          .from(residentRecords)
          .innerJoin(families, eq(families.id, residentRecords.familyId))
          .innerJoin(persons, eq(persons.id, residentRecords.personId))
          .where(where)
          .groupBy(residentRecords.familyId, families.kkLast4)
          .orderBy(asc(families.kkLast4));
        return rows.map((r) => ({ key: r.familyId!, label: `KK ${maskIdNumber(r.last4)}`, detail: `Kepala: ${r.head ?? '(tidak tercatat)'} · ${Number(r.members)} warga terhitung` }));
      }
      case 'zoneKelurahan': {
        const rows = await db
          .selectDistinct({ id: regions.id, name: regions.name })
          .from(hazardZones)
          .innerJoin(regions, eq(regions.id, hazardZones.kelurahanId))
          .where(and(zoneBase(fyId, scope), compileZoneFilter(def.filter)))
          .orderBy(asc(regions.name));
        return rows.map((r) => ({ key: r.id, label: r.name, detail: 'Kelurahan dengan kawasan rawan jenis bencana ini' }));
      }
      case 'officers': {
        const rows = await db
          .select({ id: officerRecords.id, name: persons.fullName, position: officerRecords.position, status: officerRecords.employmentStatus, kel: regions.name })
          .from(officerRecords)
          .innerJoin(persons, eq(persons.id, officerRecords.personId))
          .leftJoin(regions, eq(regions.id, officerRecords.dutyKelurahanId))
          .where(and(officerBase(fyId, scope), compileOfficerFilter(def.filter)))
          .orderBy(asc(persons.fullName));
        return rows.map((r) => ({ key: r.id, label: r.name, detail: `${POSITION_LABEL[r.position]} · ${EMPLOYMENT_LABEL[r.status]} · tugas di ${r.kel ?? '-'}` }));
      }
    }
  }
}
