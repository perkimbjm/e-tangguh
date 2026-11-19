import type { RecapTable } from '@etangguh/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type LoggedIn, type TestApp, createTestApp, loginAs } from '../support/app';
import { seedKnownResidents } from '../support/recap-data';
import { type SpmYear, addZone, setupSpmYear } from '../support/spm';

const value = (t: RecapTable, rowKey: string, colKey: string) => {
  const cell = t.rows.find((r) => r.key === rowKey)?.cells[colKey];
  return cell && 'value' in cell ? cell.value : undefined;
};

describe('rekapitulasi 5.A.3, 5.A.4, 5.A.6', () => {
  let t: TestApp;
  let y: SpmYear;
  let op: LoggedIn;
  const tables: Record<string, RecapTable> = {};

  beforeAll(async () => {
    t = await createTestApp();
    y = await setupSpmYear(t, 2026);
    await addZone(t, y.fyId, y.sungaiMiai, '1', null, 4);
    await addZone(t, y.fyId, y.sungaiMiai, '2', null, 68);
    await addZone(t, y.fyId, y.kuinUtara, '1', null, 1);
    op = await loginAs(t, 'operator_bpbd');
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    await seedKnownResidents(y.year, op, pendata, y);
    for (const code of ['5.A.3', '5.A.4', '5.A.6']) tables[code] = (await op.agent.get(`/api/v1/spm/${y.year}/recap/${code}`).expect(200)).body;
  }, 60_000);
  afterAll(() => t.close());

  it('5.A.3 sama dengan hitungan manual', () => {
    const r = tables['5.A.3']!;
    expect(r.variations!.map((v) => v.mask)).toEqual([1, 4, 68]);
    const sm = `kel:${y.sungaiMiai}`;
    expect(value(r, sm, 'v:4:kk')).toBe(2); // KK1, KK2 (E tanpa KK tidak dihitung sebagai KK)
    expect(value(r, sm, 'v:4:jiwa')).toBe(5); // A, B, C, D, E (tanpa NIK tetap terhitung)
    expect(value(r, sm, 'v:68:kk')).toBe(1);
    expect(value(r, sm, 'v:68:jiwa')).toBe(2);
    expect(value(r, sm, 'total:kk')).toBe(3);
    expect(value(r, sm, 'total:jiwa')).toBe(7);
    expect(value(r, 'total', 'total:jiwa')).toBe(8);
    const jenis = r.rows.find((x) => x.key === sm)!.cells['v:68:jenis'];
    expect(jenis && 'text' in jenis && jenis.text).toBe('Banjir, Cuaca ekstrem (angin topan)');
  });

  it('5.A.4 sama dengan hitungan manual; baris menunggu dan nonaktif tidak terhitung', () => {
    const r = tables['5.A.4']!;
    const sm = `kel:${y.sungaiMiai}`;
    expect(value(r, sm, 'c9')).toBe(7);
    expect(value(r, sm, 'c10')).toBe(3);
    expect(value(r, sm, 'c11')).toBe(2); // KK1, KK3 berkepala keluarga miskin
    expect(value(r, sm, 'c12')).toBe(1);
    expect(value(r, sm, 'c13')).toBe(3); // anak, balita, lansia
    expect(value(r, sm, 'c4')).toBe(0);
  });

  it('5.A.6 sama dengan hitungan manual; kolom 11 = kolom 4 + kolom 10', () => {
    const r = tables['5.A.6']!;
    expect(value(r, 'hazard:banjir', 'c3')).toBe(7);
    expect(value(r, 'hazard:banjir', 'c4')).toBe(3);
    expect(value(r, 'hazard:banjir', 'c5')).toBe(1);
    expect(value(r, 'hazard:angin_topan', 'c3')).toBe(2);
    expect(value(r, 'hazard:gempa', 'c5')).toBe(1);
    expect(value(r, 'hazard:banjir', 'c11')).toBe(3);
    expect(value(r, 'hazard:tsunami', 'c3')).toBe(0);
  });

  it('untuk setiap sel angka, jumlah baris penelusuran = nilai sel', async () => {
    let checked = 0;
    for (const table of Object.values(tables)) {
      for (const row of table.rows) {
        for (const cell of Object.values(row.cells)) {
          if (!('cellKey' in cell)) continue;
          const res = await op.agent.get(`/api/v1/spm/${y.year}/recap/${table.formCode}/cells/${cell.cellKey}/rows`).expect(200);
          expect(res.body.rows.length, `${table.formCode} ${cell.cellKey}`).toBe(cell.value);
          expect(res.body.value).toBe(cell.value);
          expect(JSON.stringify(res.body)).not.toMatch(/99\d{14}/);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
  }, 60_000);

  it('pendata hanya melihat kelurahannya dan tidak dapat menelusuri kelurahan lain', async () => {
    const pendata = await loginAs(t, 'pendata_kelurahan', y.sungaiMiai);
    const r = (await pendata.agent.get(`/api/v1/spm/${y.year}/recap/5.A.4`).expect(200)).body as RecapTable;
    expect(r.rows.filter((x) => x.kind === 'data').map((x) => x.key)).toEqual([`kel:${y.sungaiMiai}`]);
    const other = tables['5.A.4']!.rows.find((x) => x.key === `kel:${y.kuinUtara}`)!.cells.c9!;
    await pendata.agent.get(`/api/v1/spm/${y.year}/recap/5.A.4/cells/${'cellKey' in other ? other.cellKey : ''}/rows`).expect(403);
  });
});
