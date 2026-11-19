import { seedHazardTypes, seedSampleRegions } from './reference-data';
import { exitOnError, withDatabase } from './run';

exitOnError(
  withDatabase(async (db) => {
    await db.transaction(async (tx) => {
      await seedHazardTypes(tx);
      await seedSampleRegions(tx);
    });
    console.log('Seed rujukan selesai: jenis bencana dan wilayah contoh.');
  }),
);
