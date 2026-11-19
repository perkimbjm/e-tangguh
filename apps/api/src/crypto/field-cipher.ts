import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HEADER_LENGTH = 1 + IV_LENGTH + TAG_LENGTH;

/**
 * Enkripsi per kolom AES-256-GCM. Format keluaran: `versi kunci (1 bita) | iv (12) | tag (16) |
 * ciphertext`. Versi kunci memungkinkan rotasi: kunci lama tetap dapat mendekripsi.
 */
export class FieldCipher {
  private readonly keys: ReadonlyMap<number, Buffer>;

  constructor(
    keys: ReadonlyMap<number, Buffer> | Record<number, Buffer>,
    private readonly currentVersion: number,
  ) {
    const map = keys instanceof Map ? keys : new Map(Object.entries(keys).map(([k, v]) => [Number(k), v]));
    for (const [version, key] of map) {
      if (!Number.isInteger(version) || version < 1 || version > 255) {
        throw new Error(`Versi kunci tidak sah: ${version}`);
      }
      if (key.length !== 32) throw new Error(`Kunci versi ${version} harus 32 bita`);
    }
    if (!map.has(currentVersion)) throw new Error('Kunci versi aktif tidak tersedia');
    this.keys = map;
  }

  static fromHex(hexKey: string, version: number): FieldCipher {
    return new FieldCipher(new Map([[version, Buffer.from(hexKey, 'hex')]]), version);
  }

  encrypt(plaintext: string): Buffer {
    const key = this.keys.get(this.currentVersion) as Buffer;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return Buffer.concat([Buffer.from([this.currentVersion]), iv, cipher.getAuthTag(), body]);
  }

  decrypt(payload: Buffer): string {
    if (payload.length < HEADER_LENGTH) throw new Error('Data terenkripsi rusak');
    const version = payload.readUInt8(0);
    const key = this.keys.get(version);
    if (!key) throw new Error(`Kunci versi ${version} tidak tersedia`);
    const iv = payload.subarray(1, 1 + IV_LENGTH);
    const tag = payload.subarray(1 + IV_LENGTH, HEADER_LENGTH);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(payload.subarray(HEADER_LENGTH)), decipher.final()]).toString('utf8');
  }

  encryptNullable(value: string | null | undefined): Buffer | null {
    return value === null || value === undefined || value === '' ? null : this.encrypt(value);
  }

  decryptNullable(value: Buffer | null | undefined): string | null {
    return value ? this.decrypt(value) : null;
  }
}
