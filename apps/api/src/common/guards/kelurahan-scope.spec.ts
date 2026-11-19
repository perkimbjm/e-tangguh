import type { SessionUser } from '@etangguh/shared';
import { describe, expect, it } from 'vitest';
import { KelurahanScope } from './kelurahan-scope';

const K1 = '00000000-0000-4000-8000-000000000001';
const K2 = '00000000-0000-4000-8000-000000000002';
const base = { id: K1, email: null, phone: null };
const pendata: SessionUser = { ...base, role: 'pendata_kelurahan', kelurahanId: K1 };
const operator: SessionUser = { ...base, role: 'operator_bpbd', kelurahanId: null };

describe('KelurahanScope', () => {
  it('pendata selalu dibatasi kelurahannya', () => {
    expect(KelurahanScope.resolve(pendata)).toBe(K1);
    expect(KelurahanScope.resolve(pendata, K1)).toBe(K1);
  });

  it('pendata yang meminta kelurahan lain ditolak 403', () => {
    expect(() => KelurahanScope.resolve(pendata, K2)).toThrow(/kelurahan Anda/);
    expect(() => KelurahanScope.assert(pendata, K2)).toThrow();
  });

  it('operator boleh seluruh kota atau kelurahan pilihan', () => {
    expect(KelurahanScope.resolve(operator)).toBeNull();
    expect(KelurahanScope.resolve(operator, K2)).toBe(K2);
    expect(() => KelurahanScope.assert(operator, K2)).not.toThrow();
  });
});
