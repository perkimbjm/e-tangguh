import { DEFAULT_AGE_BANDS, type Role } from '@etangguh/shared';
import { randomBytes } from 'node:crypto';
import type { DbExecutor } from '../client';
import { fiscalYears, users } from '../schema';
import { hashPassword } from '../../modules/auth/password';

export interface SeedAccount {
  email: string;
  role: Role;
  kelurahanCode?: string;
}

/** Akun contoh dengan domain `.invalid` (RFC 2606) agar tidak pernah menjadi alamat nyata. */
export const SEED_ACCOUNTS: SeedAccount[] = [
  { email: 'superadmin@etangguh.invalid', role: 'super_admin' },
  { email: 'admin@etangguh.invalid', role: 'admin_bpbd' },
  { email: 'operator@etangguh.invalid', role: 'operator_bpbd' },
  { email: 'pendata.sungaimiai@etangguh.invalid', role: 'pendata_kelurahan', kelurahanCode: 'CTH.01.001' },
];

export async function seedFiscalYear(db: DbExecutor, year: number): Promise<string> {
  const [row] = await db
    .insert(fiscalYears)
    .values({ year, ageReferenceDate: `${year}-12-31`, ageBands: DEFAULT_AGE_BANDS })
    .onConflictDoNothing({ target: fiscalYears.year })
    .returning({ id: fiscalYears.id });
  return row?.id ?? '';
}

/** Membuat akun contoh. Kata sandi diambil dari SEED_PASSWORD atau dibangkitkan acak. */
export async function seedAccounts(db: DbExecutor, regionIds: Record<string, string>, password?: string): Promise<string> {
  const plain = password ?? process.env.SEED_PASSWORD ?? randomBytes(12).toString('base64url');
  const passwordHash = await hashPassword(plain);
  for (const acc of SEED_ACCOUNTS) {
    await db
      .insert(users)
      .values({
        email: acc.email,
        passwordHash,
        role: acc.role,
        kelurahanId: acc.kelurahanCode ? regionIds[acc.kelurahanCode] : null,
      })
      .onConflictDoNothing({ target: users.email });
  }
  return plain;
}
