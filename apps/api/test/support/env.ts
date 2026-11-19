// Variabel lingkungan uji; kunci di sini hanya untuk uji dan tidak pernah dipakai di produksi.
const url = process.env.TEST_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/etangguh_test';
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: url,
  SESSION_SECRET: 'uji-'.padEnd(40, 'x'),
  FIELD_ENC_KEY: 'a'.repeat(64),
  FIELD_ENC_KEY_VERSION: '1',
  BLIND_INDEX_KEY: 'b'.repeat(64),
  FILE_STORAGE_DIR: process.env.TEST_FILE_STORAGE_DIR ?? '/tmp/etangguh-test-storage',
});
