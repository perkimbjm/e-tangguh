import { describe, expect, it } from 'vitest';
import { HAZARDS, MAX_HAZARD_MASK, fromMask, hasHazard, toMask, variationLabel, variationNumbers } from './hazards';

describe('hazards', () => {
  it('memiliki sepuluh jenis dengan bit 0-9 unik', () => {
    expect(HAZARDS).toHaveLength(10);
    expect(new Set(HAZARDS.map((h) => h.bit)).size).toBe(10);
    expect(MAX_HAZARD_MASK).toBe(1023);
  });

  it('toMask dan fromMask saling balik', () => {
    const mask = toMask(['banjir', 'angin_topan']);
    expect(mask).toBe((1 << 2) | (1 << 6));
    expect(fromMask(mask)).toEqual(['banjir', 'angin_topan']);
    expect(hasHazard(mask, 'banjir')).toBe(true);
    expect(hasHazard(mask, 'gempa')).toBe(false);
  });

  it('menolak kode dan mask tidak sah', () => {
    expect(() => toMask(['salah' as never])).toThrow();
    expect(() => fromMask(1024)).toThrow();
    expect(() => fromMask(-1)).toThrow();
  });

  it('label variasi mengikuti urutan formulir', () => {
    expect(variationLabel(toMask(['angin_topan', 'banjir']))).toBe('Banjir, Cuaca ekstrem (angin topan)');
    expect(variationLabel(0)).toBe('-');
  });

  it('nomor variasi diurutkan menurut bitmask dan mengabaikan duplikat', () => {
    const nums = variationNumbers([68, 4, 4, 0, 1]);
    expect([...nums.entries()]).toEqual([[1, 1], [4, 2], [68, 3]]);
  });
});
