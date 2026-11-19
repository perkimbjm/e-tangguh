import { describe, expect, it } from 'vitest';
import { ageGroup, ageInYears, isVulnerableAge, validateAgeBands } from './age-group';

const REF = '2026-12-31';

describe('ageGroup', () => {
  it('batas tepat 5 tahun: balita sampai sehari sebelum ulang tahun ke-5', () => {
    expect(ageGroup('2022-01-01', REF)).toBe('balita'); // 4 tahun
    expect(ageGroup('2021-12-31', REF)).toBe('anak'); // tepat 5
  });

  it('batas tepat 18 tahun', () => {
    expect(ageGroup('2009-01-01', REF)).toBe('anak'); // 17
    expect(ageGroup('2008-12-31', REF)).toBe('dewasa'); // tepat 18
  });

  it('batas tepat 60 tahun', () => {
    expect(ageGroup('1967-01-01', REF)).toBe('dewasa'); // 59
    expect(ageGroup('1966-12-31', REF)).toBe('lansia'); // tepat 60
  });

  it('memakai batas khusus tahun anggaran', () => {
    expect(ageGroup('1971-12-31', REF, { balitaMax: 5, anakMax: 18, lansiaMin: 55 })).toBe('lansia');
  });

  it('ulang tahun 29 Februari dan tanggal lahir di masa depan', () => {
    expect(ageInYears('2000-02-29', '2026-02-28')).toBe(25);
    expect(ageInYears('2000-02-29', '2026-03-01')).toBe(26);
    expect(() => ageGroup('2027-01-01', REF)).toThrow();
  });

  it('kelompok rentan = selain dewasa', () => {
    expect(isVulnerableAge('balita')).toBe(true);
    expect(isVulnerableAge('dewasa')).toBe(false);
  });

  it('validasi batas', () => {
    expect(validateAgeBands({ balitaMax: 5, anakMax: 18, lansiaMin: 60 })).toBeNull();
    expect(validateAgeBands({ balitaMax: 18, anakMax: 5, lansiaMin: 60 })).not.toBeNull();
  });
});
