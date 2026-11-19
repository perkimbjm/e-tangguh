import { isSixteenDigits, normalizeIdNumber } from '../identity';
import { EMPLOYMENT_STATUSES, type EmploymentStatus, OFFICER_POSITIONS, type OfficerPosition, POSITION_STATUS, STATUS_DEFAULT_POSITION } from '../officers';
import { type CellValue, cellText, parseCheck, parseDate, parseGender } from './cell-values';
import { type RowError, rowError } from './error-codes';

export interface NormalizedOfficerRow {
  fullName: string;
  nik: string | null;
  noNikReason: string | null;
  gender: 'L' | 'P';
  birthPlace: string | null;
  birthDate: string | null;
  residenceKelurahanName: string;
  dutyKelurahanName: string | null;
  employmentStatus: EmploymentStatus;
  position: OfficerPosition;
  certifications: string | null;
  isTrcKlb: boolean;
  isTrcPdb: boolean;
  isPpe: boolean;
  postType: 'posko' | 'pos_lapangan' | null;
  note: string | null;
}

const POSITION_ALIASES: Record<string, OfficerPosition> = {
  kasi: 'kasi_trantibumlinmas',
  'kasi trantibumlinmas': 'kasi_trantibumlinmas',
  babinsa: 'babinsa',
  bhabinkamtibmas: 'bhabinkamtibmas',
  linmas: 'linmas',
  satlinmas: 'linmas',
  relawan: 'relawan',
  lainnya: 'lainnya',
};

export function parsePosition(v: CellValue): OfficerPosition | null | undefined {
  const t = cellText(v).toLowerCase().replace(/_/g, ' ').trim();
  if (!t) return undefined;
  if ((OFFICER_POSITIONS as readonly string[]).includes(t.replace(/ /g, '_'))) return t.replace(/ /g, '_') as OfficerPosition;
  return POSITION_ALIASES[t] ?? null;
}

/** Validasi satu baris Form 5.A.5 (nomor kolom mengikuti formulir). */
export function validateOfficerRow(raw: Partial<Record<string, CellValue>>, today = new Date().toISOString().slice(0, 10)): { value: NormalizedOfficerRow | null; errors: RowError[] } {
  const errors: RowError[] = [];
  const fullName = cellText(raw.fullName).slice(0, 200);
  if (!fullName) errors.push(rowError(2, 'NAMA_KOSONG'));

  const nikText = cellText(raw.nik);
  const nikDigits = normalizeIdNumber(nikText);
  let nik: string | null = null;
  let noNikReason: string | null = null;
  if (nikDigits) {
    if (isSixteenDigits(nikDigits)) nik = nikDigits;
    else errors.push(rowError(3, 'NIK_PANJANG', `${nikDigits.length} digit`));
  } else if (nikText) noNikReason = nikText.slice(0, 300);
  else errors.push(rowError(3, 'NIK_KOSONG_TANPA_ALASAN'));

  const gender = parseGender(raw.gender);
  if (!gender) errors.push(rowError(5, 'PILIHAN_TIDAK_SAH', 'jenis kelamin harus L atau P'));
  const birthText = cellText(raw.birthDate ?? null);
  const birthDate = birthText ? parseDate(raw.birthDate ?? null) : null;
  if (birthText && (!birthDate || birthDate > today)) errors.push(rowError(7, 'TANGGAL_TIDAK_SAH'));

  const statuses = EMPLOYMENT_STATUSES.filter((s) => parseCheck(raw[`st_${s}`] ?? null));
  if (statuses.length !== 1) errors.push(rowError(15, 'PILIHAN_TIDAK_SAH', 'centang tepat satu status petugas (kolom 15-20)'));
  const parsedPosition = parsePosition(raw.position ?? null);
  if (parsedPosition === null) errors.push(rowError(15, 'PILIHAN_TIDAK_SAH', 'jabatan tidak dikenal'));
  const status = statuses[0];
  const position = parsedPosition ?? (status ? STATUS_DEFAULT_POSITION[status] : 'lainnya');
  if (status && parsedPosition && POSITION_STATUS[parsedPosition] && POSITION_STATUS[parsedPosition] !== status) {
    errors.push(rowError(15, 'PILIHAN_TIDAK_SAH', 'status tidak sesuai jabatan'));
  }

  const posko = parseCheck(raw.post_posko ?? null);
  const lapangan = parseCheck(raw.post_pos_lapangan ?? null);
  if (posko && lapangan) errors.push(rowError(25, 'PILIHAN_TIDAK_SAH', 'pilih posko atau pos lapangan'));
  const flags = { isTrcKlb: parseCheck(raw.isTrcKlb ?? null), isTrcPdb: parseCheck(raw.isTrcPdb ?? null), isPpe: parseCheck(raw.isPpe ?? null) };
  if (Object.values(flags).some((f) => f === null)) errors.push(rowError(22, 'PILIHAN_TIDAK_SAH', 'gunakan tanda centang atau kosong'));

  const residence = cellText(raw.kelurahan).slice(0, 100);
  const duty = cellText(raw.dutyKelurahan).slice(0, 100) || null;
  if (!residence && !duty && position !== 'lainnya') errors.push(rowError(9, 'WILAYAH_TIDAK_DIKENAL', 'kelurahan kosong'));

  if (errors.length) return { value: null, errors };
  return {
    value: {
      fullName,
      nik,
      noNikReason,
      gender: gender!,
      birthPlace: cellText(raw.birthPlace).slice(0, 100) || null,
      birthDate,
      residenceKelurahanName: residence,
      dutyKelurahanName: duty,
      employmentStatus: status!,
      position,
      certifications: cellText(raw.certifications).slice(0, 1000) || null,
      isTrcKlb: Boolean(flags.isTrcKlb),
      isTrcPdb: Boolean(flags.isTrcPdb),
      isPpe: Boolean(flags.isPpe),
      postType: posko ? 'posko' : lapangan ? 'pos_lapangan' : null,
      note: cellText(raw.note).slice(0, 500) || null,
    },
    errors: [],
  };
}
