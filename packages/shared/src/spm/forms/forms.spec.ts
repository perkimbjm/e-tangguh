import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { FORM_5A1, FORM_5A2, FORM_5A4, FORM_5A5, FORM_5A7, FORM_5A8, FORM_5A9, FORM_5A10, FORM_5A11, FORM_5A12, FORM_5A6, buildForm5A3 } from './index';
import type { FormDefinition } from './types';

const REF_DIR = path.resolve(__dirname, '../../../../../specs/002-spm-data-dasar/reference/form-headers');
const ref = (name: string) => JSON.parse(readFileSync(path.join(REF_DIR, `${name}.header.json`), 'utf8')) as { cells: Record<string, string>; merged_ranges: string[]; header_last_row: number };

describe('definisi formulir = rujukan kepala resmi', () => {
  it.each<[string, FormDefinition]>([
    ['form-5a1', FORM_5A1],
    ['form-5a2', FORM_5A2],
    ['form-5a4', FORM_5A4],
    ['form-5a5', FORM_5A5],
    ['form-5a7', FORM_5A7],
    ['form-5a8', FORM_5A8],
    ['form-5a9', FORM_5A9],
    ['form-5a10', FORM_5A10],
    ['form-5a11', FORM_5A11],
    ['form-5a12', FORM_5A12],
    ['form-5a6', FORM_5A6],
  ])('%s', (name, def) => {
    const r = ref(name);
    expect(def.cells).toEqual(r.cells);
    expect([...def.merged].sort()).toEqual([...r.merged_ranges].sort());
    expect(def.headerLastRow).toBe(r.header_last_row);
  });

  it('form-5a3 dengan tiga variasi sama dengan rujukan (VARIASI 3 = "VARIASI n")', () => {
    const r = ref('form-5a3');
    const def = buildForm5A3([1, 4, 68]);
    const cells = { ...def.cells, J3: def.cells.J3 === 'VARIASI 3' ? 'VARIASI n' : def.cells.J3 };
    expect(cells).toEqual(r.cells);
    expect([...def.merged].sort()).toEqual([...r.merged_ranges].sort());
  });

  it('form-5a3 menambah kolom sesuai jumlah variasi', () => {
    const def = buildForm5A3([1, 2, 4, 8, 16]);
    expect(def.columns.at(-1)?.number).toBe(4 + 15 + 1);
    expect(def.cells['S5']).toBe('19 = 5+8+11+14+17');
  });
});
