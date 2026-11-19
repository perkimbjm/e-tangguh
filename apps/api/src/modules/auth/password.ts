import argon2 from 'argon2';

// Parameter Argon2id sesuai rekomendasi OWASP (m=19 MiB, t=2, p=1).
const OPTIONS = { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

let dummyHash: Promise<string> | undefined;

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** Verifikasi tiruan agar waktu respons akun ada/tidak ada sama. */
export async function verifyDummy(plain: string): Promise<false> {
  dummyHash ??= hashPassword('kata-sandi-tiruan-untuk-penyamaan-waktu');
  await verifyPassword(await dummyHash, plain);
  return false;
}
