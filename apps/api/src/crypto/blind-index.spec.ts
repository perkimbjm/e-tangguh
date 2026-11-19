import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { BlindIndex, last4 } from './blind-index';

const index = new BlindIndex(randomBytes(32));

describe('BlindIndex', () => {
  it('deterministik untuk nilai yang sama', () => {
    expect(index.compute('nik', '6371010101900001').equals(index.compute('nik', '6371010101900001'))).toBe(true);
  });

  it('menormalkan spasi dan pemisah pada NIK/KK', () => {
    expect(index.compute('nik', ' 6371 0101 0190 0001 ').equals(index.compute('nik', '6371010101900001'))).toBe(true);
    expect(index.compute('kk', '6371-0101-0190-0001').equals(index.compute('kk', '6371010101900001'))).toBe(true);
  });

  it('memisahkan ranah: NIK dan KK bernilai sama menghasilkan hash berbeda', () => {
    expect(index.compute('nik', '6371010101900001').equals(index.compute('kk', '6371010101900001'))).toBe(false);
  });

  it('bergantung pada kunci', () => {
    const other = new BlindIndex(randomBytes(32));
    expect(other.compute('nik', '1').equals(index.compute('nik', '1'))).toBe(false);
  });

  it('menolak kunci pendek dan nilai kosong', () => {
    expect(() => new BlindIndex(randomBytes(16))).toThrow();
    expect(() => index.compute('nik', '  ')).toThrow();
  });

  it('email tidak peka huruf besar', () => {
    expect(index.compute('email', 'A@B.id').equals(index.compute('email', 'a@b.id'))).toBe(true);
  });

  it('last4 mengambil empat digit terakhir', () => {
    expect(last4('6371 0101 0190 0001')).toBe('0001');
  });
});
