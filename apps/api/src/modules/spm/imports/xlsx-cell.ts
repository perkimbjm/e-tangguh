import type { CellValue } from '@etangguh/shared';

/** Mengubah nilai sel ExcelJS (teks kaya, rumus, tautan) menjadi nilai sederhana. */
export function plainCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value instanceof Date) return value;
  if (typeof value === 'object') {
    const v = value as { richText?: { text: string }[]; result?: unknown; text?: unknown; error?: unknown };
    if (Array.isArray(v.richText)) return v.richText.map((r) => r.text).join('');
    if ('result' in v) return plainCell(v.result);
    if (typeof v.text === 'string') return v.text;
    if (v.error) return null;
  }
  return String(value);
}

export function isBlank(value: CellValue): boolean {
  return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}
