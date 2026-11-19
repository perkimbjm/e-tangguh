import { Injectable } from '@nestjs/common';
import type { FiscalYearDto, SessionUser } from '@etangguh/shared';
import { sql } from 'drizzle-orm';
import { ApiException } from '../../../common/errors/api-exception';
import { DbService } from '../../../db/db.module';
import { AuditContext } from '../../audit/audit-context';
import { FiscalYearsRepository } from './fiscal-years.repository';
import { toFiscalYearDto } from './fiscal-years.service';

export interface CopyCounts {
  hazardZones: number;
  residents: number;
  officers: number;
  equipment: number;
  logistics: number;
}

/**
 * Salin maju (R2, data-model.md): membuka tahun baru dengan menyalin kawasan rawan, warga aktif yang
 * disetujui, petugas, peralatan, dan stok logistik. Kejadian dan korban tidak disalin. Kelompok
 * umur dihitung ulang terhadap tanggal acuan tahun baru, kecuali yang dikoreksi manual.
 */
@Injectable()
export class CopyForwardService {
  constructor(
    private readonly db: DbService,
    private readonly years: FiscalYearsRepository,
  ) {}

  async copy(
    year: number,
    fromYear: number,
    user: SessionUser,
  ): Promise<FiscalYearDto & { copied: CopyCounts }> {
    if (fromYear === year)
      throw ApiException.validation({ copyFrom: 'Tahun sumber harus berbeda' });
    const src = await this.years.findByYear(fromYear);
    if (!src)
      throw ApiException.validation({ copyFrom: `Tahun anggaran ${fromYear} tidak ditemukan` });
    if (await this.years.findByYear(year))
      throw ApiException.conflict('TAHUN_SUDAH_ADA', `Tahun anggaran ${year} sudah dibuka`);

    const fy = await this.years.insert({
      year,
      ageReferenceDate: `${year}-12-31`,
      ageBands: src.ageBands,
      copiedFromId: src.id,
      createdBy: user.id,
    });
    const db = this.db.executor();
    const run = async (q: ReturnType<typeof sql>) =>
      Number(((await db.execute(q)) as unknown as { rowCount: number | null }).rowCount ?? 0);
    const b = fy.ageBands;

    await db.execute(
      sql`CREATE TEMP TABLE IF NOT EXISTS copy_zone_map (old_id uuid PRIMARY KEY, new_id uuid NOT NULL) ON COMMIT DROP`,
    );
    await db.execute(sql`DELETE FROM copy_zone_map`);
    await db.execute(
      sql`INSERT INTO copy_zone_map SELECT id, gen_random_uuid() FROM hazard_zones WHERE fiscal_year_id = ${src.id}`,
    );
    const hazardZones = await run(sql`
      INSERT INTO hazard_zones (id, fiscal_year_id, kelurahan_id, rw, rt, hazard_mask, basis, basis_ref, geom, created_by)
      SELECT m.new_id, ${fy.id}, z.kelurahan_id, z.rw, z.rt, z.hazard_mask, z.basis, z.basis_ref, z.geom, ${user.id}
      FROM hazard_zones z JOIN copy_zone_map m ON m.old_id = z.id`);

    const years = sql`date_part('year', age(${fy.ageReferenceDate}::date, p.birth_date))`;
    const residents = await run(sql`
      INSERT INTO resident_records (fiscal_year_id, person_id, family_id, is_family_head, kelurahan_id, rw, rt, hazard_zone_id,
        address_enc, is_poor, has_special_needs, special_needs_enc, age_group, age_group_override_reason, hazard_mask,
        is_active, approval_status, approved_by, approved_at, source, source_date, created_by)
      SELECT ${fy.id}, r.person_id, r.family_id, r.is_family_head, r.kelurahan_id, r.rw, r.rt, m.new_id,
        r.address_enc, r.is_poor, r.has_special_needs, r.special_needs_enc,
        CASE WHEN r.age_group_override_reason IS NOT NULL OR p.birth_date IS NULL THEN r.age_group
          ELSE (CASE WHEN ${years} < ${b.balitaMax} THEN 'balita' WHEN ${years} < ${b.anakMax} THEN 'anak'
                     WHEN ${years} >= ${b.lansiaMin} THEN 'lansia' ELSE 'dewasa' END)::age_group END,
        r.age_group_override_reason, r.hazard_mask, true, 'disetujui', ${user.id}, now(), r.source, r.source_date, ${user.id}
      FROM resident_records r
      JOIN persons p ON p.id = r.person_id
      LEFT JOIN copy_zone_map m ON m.old_id = r.hazard_zone_id
      WHERE r.fiscal_year_id = ${src.id} AND r.is_active AND r.approval_status = 'disetujui' AND p.merged_into_id IS NULL`);

    const officers = await run(sql`
      INSERT INTO officer_records (fiscal_year_id, person_id, volunteer_id, position, employment_status, duty_kelurahan_id, certifications,
        is_trc_klb, is_trc_pdb, is_ppe, is_ops, post_type, post_kelurahan_id, hazard_mask, note, photo_file_id, photo_frame, created_by)
      SELECT ${fy.id}, person_id, volunteer_id, position, employment_status, duty_kelurahan_id, certifications,
        is_trc_klb, is_trc_pdb, is_ppe, is_ops, post_type, post_kelurahan_id, hazard_mask, note, photo_file_id, photo_frame, ${user.id}
      FROM officer_records WHERE fiscal_year_id = ${src.id}`);

    const inv = (table: 'equipment' | 'logistics_stock', extra: string) =>
      run(sql`
        INSERT INTO ${sql.raw(table)} (fiscal_year_id, name, quantity, unit, location_text, institution, qty_good, qty_broken, created_by${sql.raw(extra ? `, ${extra}` : '')})
        SELECT ${fy.id}, name, quantity, unit, location_text, institution, qty_good, qty_broken, ${user.id}${sql.raw(extra ? `, ${extra}` : '')}
        FROM ${sql.raw(table)} WHERE fiscal_year_id = ${src.id}`);
    const equipment = await inv(
      'equipment',
      'support_kaji_cepat, support_pencarian, support_korban_meninggal, support_medis, support_pengungsian',
    );
    const logistics = await inv('logistics_stock', '');

    const copied = { hazardZones, residents, officers, equipment, logistics };
    AuditContext.annotate({ entityId: fy.id, detail: { year, fromYear, ...copied } });
    return { ...toFiscalYearDto(fy, fromYear), copied };
  }
}
