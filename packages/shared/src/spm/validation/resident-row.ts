import { isSixteenDigits, normalizeIdNumber } from '../identity';
import {
  type CellValue,
  cellText,
  normalizeRtRw,
  parseDate,
  parseEconomy,
  parseGender,
  parseRtRwFromAddress,
  parseYesNo,
} from './cell-values';
import { type RowError, rowError } from './error-codes';

/** Baris Form 5.A.1 setelah normalisasi, sebelum pemadanan wilayah dan kawasan rawan. */
export interface NormalizedResidentRow {
  fullName: string;
  isFamilyHead: boolean;
  nik: string | null;
  noNikReason: string | null;
  kk: string | null;
  gender: 'L' | 'P';
  birthPlace: string | null;
  birthDate: string;
  address: string;
  kelurahanName: string;
  kecamatanName: string;
  rt: string | null;
  rw: string;
  isPoor: boolean;
  hasSpecialNeeds: boolean;
  specialNeeds: string | null;
}

export type RawResidentRow = Partial<Record<string, CellValue>>;

export interface ResidentRowResult {
  value: NormalizedResidentRow | null;
  errors: RowError[];
}

const MAX_TEXT = 200;
const trimText = (v: CellValue, max = MAX_TEXT) => cellText(v).slice(0, max);

/**
 * Validasi dan normalisasi satu baris Form 5.A.1 (nomor kolom mengikuti formulir). Murni: tanpa
 * akses basis data, dipakai bersama server dan antarmuka.
 */
export function validateResidentRow(raw: RawResidentRow, today = new Date().toISOString().slice(0, 10)): ResidentRowResult {
  const errors: RowError[] = [];

  const headName = trimText(raw.headName);
  const memberName = trimText(raw.memberName);
  if (!headName && !memberName) errors.push(rowError(2, 'NAMA_KOSONG'));
  if (headName && memberName) errors.push(rowError(3, 'PILIHAN_TIDAK_SAH', 'isi nama kepala keluarga atau anggota, bukan keduanya'));

  const nikText = cellText(raw.nik);
  const nikDigits = normalizeIdNumber(nikText);
  const helperReason = trimText(raw.noNikReason, 300);
  let nik: string | null = null;
  let noNikReason: string | null = null;
  if (nikDigits.length > 0) {
    if (isSixteenDigits(nikDigits)) nik = nikDigits;
    else errors.push(rowError(4, 'NIK_PANJANG', `${nikDigits.length} digit`));
  } else if (helperReason || nikText) {
    // Teks tanpa angka di sel NIK diperlakukan sebagai alasan belum ada NIK.
    noNikReason = helperReason || nikText.slice(0, 300);
  } else {
    errors.push(rowError(4, 'NIK_KOSONG_TANPA_ALASAN'));
  }

  const kkDigits = normalizeIdNumber(cellText(raw.kk));
  let kk: string | null = null;
  if (kkDigits.length > 0) {
    if (isSixteenDigits(kkDigits)) kk = kkDigits;
    else errors.push(rowError(5, 'KK_PANJANG', `${kkDigits.length} digit`));
  }

  const gender = parseGender(raw.gender);
  if (!gender) errors.push(rowError(6, 'PILIHAN_TIDAK_SAH', 'jenis kelamin harus L atau P'));

  const birthDate = parseDate(raw.birthDate ?? null);
  if (!birthDate || birthDate > today) errors.push(rowError(8, 'TANGGAL_TIDAK_SAH'));

  const address = trimText(raw.address, 300);
  const fromAddress = parseRtRwFromAddress(address);
  const rw = normalizeRtRw(raw.rw) ?? fromAddress.rw;
  const rt = normalizeRtRw(raw.rt) ?? fromAddress.rt;
  if (!rw) errors.push(rowError(9, 'RT_RW_TIDAK_TERBACA'));

  const kelurahanName = trimText(raw.kelurahan, 100);
  const kecamatanName = trimText(raw.kecamatan, 100);
  if (!kelurahanName) errors.push(rowError(10, 'WILAYAH_TIDAK_DIKENAL', 'kelurahan kosong'));

  const isPoor = parseEconomy(raw.economy);
  if (isPoor === null) errors.push(rowError(12, 'PILIHAN_TIDAK_SAH', 'isi "miskin" atau "tidak miskin"'));

  const hasSpecialNeeds = parseYesNo(raw.specialNeedsFlag);
  const specialNeeds = trimText(raw.specialNeeds, 300) || null;
  if (hasSpecialNeeds === null) errors.push(rowError(13, 'PILIHAN_TIDAK_SAH', 'isi "ya" atau "tidak"'));
  if (hasSpecialNeeds && !specialNeeds) errors.push(rowError(14, 'KEBUTUHAN_KHUSUS_KOSONG'));

  if (errors.length > 0) return { value: null, errors };
  return {
    value: {
      fullName: headName || memberName,
      isFamilyHead: Boolean(headName),
      nik,
      noNikReason,
      kk,
      gender: gender!,
      birthPlace: trimText(raw.birthPlace, 100) || null,
      birthDate: birthDate!,
      address,
      kelurahanName,
      kecamatanName,
      rt,
      rw: rw!,
      isPoor: isPoor!,
      hasSpecialNeeds: hasSpecialNeeds!,
      specialNeeds: hasSpecialNeeds ? specialNeeds : null,
    },
    errors: [],
  };
}
