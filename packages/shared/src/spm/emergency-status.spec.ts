import { describe, expect, it } from 'vitest';
import { emergencyStatus } from './emergency-status';

const reported = '2026-01-10T08:00:00+08:00';
const plus = (h: number) => new Date(new Date(reported).getTime() + h * 3600_000);

describe('emergencyStatus', () => {
  it('tanpa penetapan → tidak dikeluarkan', () => expect(emergencyStatus(reported, null)).toBe('tidak_dikeluarkan'));
  it('10 jam setelah laporan → < 24 jam', () => expect(emergencyStatus(reported, plus(10))).toBe('kurang_24_jam'));
  it('tepat 24 jam → < 24 jam', () => expect(emergencyStatus(reported, plus(24))).toBe('kurang_24_jam'));
  it('30 jam setelah laporan → > 24 jam', () => expect(emergencyStatus(reported, plus(30))).toBe('lebih_24_jam'));
});
