import { seedHazardTypes, seedSampleRegions } from './reference-data';
import { exitOnError, withDatabase } from './run';
import { SEED_ACCOUNTS, seedAccounts, seedFiscalYear } from './spm-data';

exitOnError(
  withDatabase(async (db) => {
    let password = '';
    await db.transaction(async (tx) => {
      await seedHazardTypes(tx);
      const regionIds = await seedSampleRegions(tx);
      await seedFiscalYear(tx, 2026);
      password = await seedAccounts(tx, regionIds);
    });
    console.log('Seed SPM selesai: tahun anggaran 2026, tiga kelurahan contoh, akun contoh:');
    for (const a of SEED_ACCOUNTS) console.log(`  ${a.role.padEnd(18)} ${a.email}`);
    if (!process.env.SEED_PASSWORD) {
      console.log(`Kata sandi akun baru (hanya ditampilkan sekali, ganti setelah masuk): ${password}`);
    }
  }),
);
