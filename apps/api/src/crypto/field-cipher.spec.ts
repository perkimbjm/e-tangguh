import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FieldCipher } from './field-cipher';

const key1 = randomBytes(32);
const key2 = randomBytes(32);

describe('FieldCipher', () => {
  it('mengenkripsi dan mendekripsi kembali nilai yang sama', () => {
    const cipher = new FieldCipher(new Map([[1, key1]]), 1);
    const nik = '6371010101900001';
    const enc = cipher.encrypt(nik);
    expect(enc.includes(Buffer.from(nik))).toBe(false);
    expect(cipher.decrypt(enc)).toBe(nik);
  });

  it('menghasilkan ciphertext berbeda untuk nilai sama (IV acak)', () => {
    const cipher = new FieldCipher(new Map([[1, key1]]), 1);
    expect(cipher.encrypt('abc').equals(cipher.encrypt('abc'))).toBe(false);
  });

  it('menyimpan versi kunci pada bita pertama dan mendukung rotasi', () => {
    const old = new FieldCipher(new Map([[1, key1]]), 1);
    const encOld = old.encrypt('Jl. Contoh 1');
    const rotated = new FieldCipher(new Map([[1, key1], [2, key2]]), 2);
    const encNew = rotated.encrypt('Jl. Contoh 2');
    expect(encOld[0]).toBe(1);
    expect(encNew[0]).toBe(2);
    expect(rotated.decrypt(encOld)).toBe('Jl. Contoh 1');
    expect(rotated.decrypt(encNew)).toBe('Jl. Contoh 2');
  });

  it('menolak data yang diubah (tag otentikasi)', () => {
    const cipher = new FieldCipher(new Map([[1, key1]]), 1);
    const enc = cipher.encrypt('rahasia');
    enc[enc.length - 1] ^= 0xff;
    expect(() => cipher.decrypt(enc)).toThrow();
  });

  it('menolak kunci dengan panjang salah dan versi kunci tidak dikenal', () => {
    expect(() => new FieldCipher(new Map([[1, randomBytes(16)]]), 1)).toThrow();
    const a = new FieldCipher(new Map([[1, key1]]), 1);
    const b = new FieldCipher(new Map([[2, key2]]), 2);
    expect(() => b.decrypt(a.encrypt('x'))).toThrow(/versi 1/);
  });

  it('menangani nilai kosong pada varian nullable', () => {
    const cipher = FieldCipher.fromHex(key1.toString('hex'), 1);
    expect(cipher.encryptNullable(null)).toBeNull();
    expect(cipher.encryptNullable('')).toBeNull();
    expect(cipher.decryptNullable(null)).toBeNull();
    expect(cipher.decryptNullable(cipher.encryptNullable('a'))).toBe('a');
  });
});
