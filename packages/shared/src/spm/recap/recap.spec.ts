import { describe, expect, it } from 'vitest';
import { RECAP_5A3, RECAP_5A4, RECAP_5A6, decodeCellKey, encodeCellKey, type RecapContext } from './index';

const ctx: RecapContext = {
  kelurahan: [
    { id: 'k1', name: 'A', kecamatanId: 'c1', kecamatanName: 'X' },
    { id: 'k2', name: 'B', kecamatanId: 'c1', kecamatanName: 'X' },
    { id: 'k3', name: 'C', kecamatanId: 'c2', kecamatanName: 'Y' },
  ],
  masks: [68, 4, 4],
};

describe('definisi sel rekap', () => {
  it('cell_key bolak-balik', () => {
    const key = encodeCellKey('5.A.3', 'kel:k1', 'v:4:kk');
    expect(decodeCellKey(key)).toEqual({ formCode: '5.A.3', rowKey: 'kel:k1', colKey: 'v:4:kk' });
    expect(decodeCellKey('5.A.9~a~b')).toBeNull();
    expect(decodeCellKey('rusak')).toBeNull();
  });

  it('5.A.3: variasi berurut bitmask; total = penjumlahan variasi; baris kecamatan = penjumlahan kelurahan', () => {
    expect(RECAP_5A3.variations(ctx).map((v) => v.mask)).toEqual([4, 68]);
    expect(RECAP_5A3.cell('kel:k1', 'v:68:jiwa', ctx)).toMatchObject({ kind: 'measure', measure: 'persons', filter: { kelurahanId: 'k1', hazardMask: 68 } });
    expect(RECAP_5A3.cell('kel:k1', 'total:kk', ctx)).toMatchObject({ kind: 'sum', parts: [{ colKey: 'v:4:kk' }, { colKey: 'v:68:kk' }] });
    const kec = RECAP_5A3.cell('kec:c1', 'v:4:kk', ctx);
    expect(kec).toMatchObject({ kind: 'sum', parts: [{ rowKey: 'kel:k1' }, { rowKey: 'kel:k2' }] });
    expect(RECAP_5A3.cell('kel:k1', 'v:4:jenis', ctx)).toBeNull();
    const rows = RECAP_5A3.rows(ctx).map((r) => r.key);
    expect(rows).toEqual(['kel:k1', 'kel:k2', 'kec:c1', 'kel:k3', 'kec:c2', 'total']);
  });

  it('5.A.4: KK miskin = KK berbeda dengan kepala keluarga miskin; aparatur menurut status kepegawaian', () => {
    expect(RECAP_5A4.cell('kel:k1', 'c11', ctx)).toMatchObject({ measure: 'families', filter: { kelurahanId: 'k1', isFamilyHead: true, isPoor: true } });
    expect(RECAP_5A4.cell('kel:k1', 'c13', ctx)).toMatchObject({ measure: 'persons', filter: { vulnerableAge: true } });
    expect(RECAP_5A4.cell('kel:k1', 'c5', ctx)).toMatchObject({ measure: 'officers', filter: { kelurahanId: 'k1', employmentStatus: 'tni' } });
  });

  it('5.A.6: baris jenis bencana memakai bit; kolom 11 = kolom 4 + kolom 10', () => {
    expect(RECAP_5A6.rows()).toHaveLength(10);
    expect(RECAP_5A6.cell('hazard:banjir', 'c3')).toMatchObject({ measure: 'persons', filter: { hazardBit: 2 } });
    expect(RECAP_5A6.cell('hazard:banjir', 'c10')).toMatchObject({ measure: 'officers', filter: { anyDuty: true, hazardBit: 2 } });
    expect(RECAP_5A6.cell('hazard:banjir', 'c11')).toMatchObject({ kind: 'sum', parts: [{ colKey: 'c4' }, { colKey: 'c10' }] });
  });
});
