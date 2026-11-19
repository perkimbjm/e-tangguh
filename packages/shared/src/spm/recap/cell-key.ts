import type { RecapFormCode } from './types';

const SAFE = /^[A-Za-z0-9:._-]+$/;

/** `cell_key` = `formCode~rowKey~colKey`; seluruh karakternya aman dipakai di jalur URL. */
export function encodeCellKey(formCode: RecapFormCode, rowKey: string, colKey: string): string {
  if (!SAFE.test(rowKey) || !SAFE.test(colKey)) throw new Error('Kunci sel mengandung karakter tidak sah');
  return `${formCode}~${rowKey}~${colKey}`;
}

export function decodeCellKey(cellKey: string): { formCode: RecapFormCode; rowKey: string; colKey: string } | null {
  const parts = cellKey.split('~');
  if (parts.length !== 3) return null;
  const [formCode, rowKey, colKey] = parts as [string, string, string];
  if (!['5.A.3', '5.A.4', '5.A.6'].includes(formCode) || !SAFE.test(rowKey) || !SAFE.test(colKey)) return null;
  return { formCode: formCode as RecapFormCode, rowKey, colKey };
}
