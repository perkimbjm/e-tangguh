import { HAZARDS, type HazardCode, toMask } from '../hazards';
import { isSixteenDigits, normalizeIdNumber } from '../identity';
import { type CellValue, cellText, parseCheck } from './cell-values';
import { type RowError, rowError } from './error-codes';

/** Baris Form 5.A.2: identitas untuk mencocokkan warga + centang jenis kerawanan. */
export interface NormalizedHazardRow {
  fullName: string;
  nik: string | null;
  kk: string | null;
  kelurahanName: string;
  hazardMask: number;
}

export function validateHazardRow(raw: Partial<Record<string, CellValue>>): { value: NormalizedHazardRow | null; errors: RowError[] } {
  const errors: RowError[] = [];
  const fullName = cellText(raw.headName) || cellText(raw.memberName);
  if (!fullName) errors.push(rowError(2, 'NAMA_KOSONG'));

  const nikDigits = normalizeIdNumber(cellText(raw.nik));
  if (nikDigits && !isSixteenDigits(nikDigits)) errors.push(rowError(4, 'NIK_PANJANG', `${nikDigits.length} digit`));
  const kkDigits = normalizeIdNumber(cellText(raw.kk));
  if (kkDigits && !isSixteenDigits(kkDigits)) errors.push(rowError(5, 'KK_PANJANG', `${kkDigits.length} digit`));

  const codes: HazardCode[] = [];
  HAZARDS.forEach((h, i) => {
    const v = parseCheck(raw[`hazard_${h.code}`] ?? null);
    if (v === null) errors.push(rowError(9 + i, 'PILIHAN_TIDAK_SAH', 'gunakan tanda centang atau kosong'));
    else if (v) codes.push(h.code);
  });
  if (errors.length === 0 && codes.length === 0) errors.push(rowError(9, 'PILIHAN_TIDAK_SAH', 'minimal satu jenis kerawanan'));

  if (errors.length > 0) return { value: null, errors };
  return {
    value: {
      fullName,
      nik: nikDigits || null,
      kk: kkDigits || null,
      kelurahanName: cellText(raw.kelurahan),
      hazardMask: toMask(codes),
    },
    errors: [],
  };
}
