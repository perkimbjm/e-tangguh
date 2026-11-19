import { z } from 'zod';

const hexKey = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, 'harus 64 karakter heksadesimal (32 bita)');

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url('harus berupa URL koneksi PostgreSQL'),
  SESSION_SECRET: z.string().min(32, 'minimal 32 karakter'),
  FIELD_ENC_KEY: hexKey,
  FIELD_ENC_KEY_VERSION: z.coerce.number().int().min(1).max(255),
  BLIND_INDEX_KEY: hexKey,
  FILE_STORAGE_DIR: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Memvalidasi variabel lingkungan; menghentikan proses bila tidak sah. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached && source === process.env) return cached;
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Konfigurasi lingkungan tidak sah: ${detail}`);
  }
  if (parsed.data.FIELD_ENC_KEY.toLowerCase() === parsed.data.BLIND_INDEX_KEY.toLowerCase()) {
    throw new Error('Konfigurasi lingkungan tidak sah: FIELD_ENC_KEY dan BLIND_INDEX_KEY harus berbeda');
  }
  if (source === process.env) cached = parsed.data;
  return parsed.data;
}
