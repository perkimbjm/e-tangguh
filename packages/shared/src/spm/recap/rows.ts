import type { RecapContext, RecapRowDef, ResidentFilter } from './types';

/** Baris per kelurahan, dikelompokkan per kecamatan dengan baris jumlah kecamatan dan total kota. */
export function kelurahanRows(ctx: RecapContext): RecapRowDef[] {
  const rows: RecapRowDef[] = [];
  const groups = new Map<string, { name: string; items: RecapContext['kelurahan'] }>();
  for (const k of ctx.kelurahan) {
    const key = k.kecamatanId ?? 'tanpa';
    if (!groups.has(key)) groups.set(key, { name: k.kecamatanName ?? '-', items: [] });
    groups.get(key)!.items.push(k);
  }
  for (const [kecId, g] of groups) {
    for (const k of g.items) rows.push({ key: `kel:${k.id}`, label: k.name, group: g.name, kind: 'data' });
    rows.push({ key: `kec:${kecId}`, label: `Jumlah Kec. ${g.name}`, group: g.name, kind: 'subtotal' });
  }
  rows.push({ key: 'total', label: 'Jumlah kota', kind: 'total' });
  return rows;
}

/** Filter baris kelurahan; `null` untuk baris jumlah (dihitung sebagai penjumlahan). */
export function kelurahanRowFilter(rowKey: string): ResidentFilter | null {
  if (rowKey.startsWith('kel:')) return { kelurahanId: rowKey.slice(4) };
  return null;
}

/** Baris komponen untuk baris jumlah: kecamatan → kelurahannya; total → semua kelurahan. */
export function kelurahanRowParts(rowKey: string, ctx: RecapContext): string[] {
  if (rowKey === 'total') return ctx.kelurahan.map((k) => `kel:${k.id}`);
  if (rowKey.startsWith('kec:')) {
    const kec = rowKey.slice(4);
    return ctx.kelurahan.filter((k) => (k.kecamatanId ?? 'tanpa') === kec).map((k) => `kel:${k.id}`);
  }
  return [];
}
