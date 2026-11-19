import { createHmac } from 'node:crypto';

/** Ranah pemakaian indeks buta; nilai sama pada ranah berbeda menghasilkan hash berbeda. */
export type BlindIndexDomain = 'nik' | 'kk' | 'email' | 'phone';

/**
 * Indeks buta HMAC-SHA-256 atas nilai ternormalisasi, dengan kunci terpisah dari kunci enkripsi.
 * Dipakai untuk mencari dan menegakkan keunikan NIK/KK tanpa menyimpan nilai asli.
 */
export class BlindIndex {
  private readonly key: Buffer;

  constructor(key: Buffer) {
    if (key.length < 32) throw new Error('Kunci indeks buta minimal 32 bita');
    this.key = key;
  }

  static fromHex(hexKey: string): BlindIndex {
    return new BlindIndex(Buffer.from(hexKey, 'hex'));
  }

  static normalize(domain: BlindIndexDomain, value: string): string {
    const base = value.normalize('NFKC').trim();
    switch (domain) {
      case 'nik':
      case 'kk':
        return base.replace(/\D/g, '');
      case 'email':
        return base.toLowerCase();
      case 'phone':
        return base.replace(/[^\d+]/g, '');
    }
  }

  compute(domain: BlindIndexDomain, value: string): Buffer {
    const normalized = BlindIndex.normalize(domain, value);
    if (normalized === '') throw new Error('Nilai kosong tidak dapat diindeks');
    return createHmac('sha256', this.key).update(`${domain}:${normalized}`).digest();
  }
}

/** Empat digit terakhir untuk tampilan tersamar. */
export function last4(value: string): string {
  return value.replace(/\D/g, '').slice(-4);
}
