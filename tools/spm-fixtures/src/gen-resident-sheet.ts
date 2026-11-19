import { writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { buildResidentSheet } from './resident-sheet';

const { values } = parseArgs({
  options: {
    rows: { type: 'string', default: '1000' },
    errors: { type: 'string', default: '0' },
    out: { type: 'string', default: 'form-5a1-sintetis.xlsx' },
    kelurahan: { type: 'string', default: 'Sungai Miai' },
    kecamatan: { type: 'string', default: 'Banjarmasin Utara' },
    rw: { type: 'string', default: '1,2' },
    seed: { type: 'string', default: '1' },
  },
});

async function main(): Promise<void> {
  const { buffer, rows } = await buildResidentSheet({
  rows: Number(values.rows),
  errors: Number(values.errors),
  kelurahan: values.kelurahan!,
  kecamatan: values.kecamatan!,
  zones: values.rw!.split(',').map((rw) => ({ rw: rw.trim() })),
  seed: Number(values.seed),
});
  await writeFile(values.out!, buffer);
  console.log(`Ditulis ${values.out}: ${rows.length} baris (${rows.filter((r) => r.error).length} salah), data SINTETIS.`);
}

void main();
