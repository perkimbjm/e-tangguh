import { describe, expect, it } from 'vitest';
import { parseCheck, parseDate, parseEconomy, parseGender, parseRtRwFromAddress, parseYesNo } from './cell-values';
import { IMPORT_ERROR_CODES, type ImportErrorCode } from './error-codes';
import { validateHazardRow } from './hazard-row';
import { type RawResidentRow, validateResidentRow } from './resident-row';

const TODAY = '2026-11-19';
const valid: RawResidentRow = {
  headName: 'Budi Contoh',
  nik: '6371 0101 0190 0001',
  kk: '6371010101900099',
  gender: 'laki-laki',
  birthPlace: 'Banjarmasin',
  birthDate: '01/02/1980',
  address: 'Jl. Contoh No. 1 RT 005 RW 002',
  kelurahan: 'Sungai Miai',
  kecamatan: 'Banjarmasin Utara',
  economy: 'tidak miskin',
  specialNeedsFlag: 'tidak',
};

function codes(raw: RawResidentRow): ImportErrorCode[] {
  return validateResidentRow(raw, TODAY).errors.map((e) => e.code);
}

describe('validateResidentRow — normalisasi', () => {
  it('menormalkan baris sah', () => {
    const { value, errors } = validateResidentRow(valid, TODAY);
    expect(errors).toEqual([]);
    expect(value).toMatchObject({
      fullName: 'Budi Contoh',
      isFamilyHead: true,
      nik: '6371010101900001',
      gender: 'L',
      birthDate: '1980-02-01',
      rt: '5',
      rw: '2',
      isPoor: false,
      hasSpecialNeeds: false,
      specialNeeds: null,
    });
  });

  it('anggota keluarga dari kolom 3; kolom RT/RW bantu mengalahkan alamat', () => {
    const { value } = validateResidentRow({ ...valid, headName: '', memberName: 'Siti', rt: '7', rw: '3' }, TODAY);
    expect(value).toMatchObject({ fullName: 'Siti', isFamilyHead: false, rt: '7', rw: '3' });
  });

  it('NIK kosong dengan alasan (kolom bantu atau teks di sel NIK) diterima', () => {
    expect(validateResidentRow({ ...valid, nik: '', noNikReason: 'bayi baru lahir' }, TODAY).value?.noNikReason).toBe('bayi baru lahir');
    expect(validateResidentRow({ ...valid, nik: 'belum ada' }, TODAY).value).toMatchObject({ nik: null, noNikReason: 'belum ada' });
  });

  it('tanggal Excel (Date dan nomor seri) diterima', () => {
    expect(validateResidentRow({ ...valid, birthDate: new Date(Date.UTC(1980, 1, 1)) }, TODAY).value?.birthDate).toBe('1980-02-01');
    expect(validateResidentRow({ ...valid, birthDate: 29252 }, TODAY).value?.birthDate).toBe('1980-02-01');
  });
});

describe('validateResidentRow — satu kasus per kode galat', () => {
  const cases: [ImportErrorCode, RawResidentRow][] = [
    ['NIK_PANJANG', { ...valid, nik: '12345' }],
    ['NIK_KOSONG_TANPA_ALASAN', { ...valid, nik: '' }],
    ['KK_PANJANG', { ...valid, kk: '123' }],
    ['NAMA_KOSONG', { ...valid, headName: '' }],
    ['TANGGAL_TIDAK_SAH', { ...valid, birthDate: '31/02/1980' }],
    ['PILIHAN_TIDAK_SAH', { ...valid, gender: 'X' }],
    ['KEBUTUHAN_KHUSUS_KOSONG', { ...valid, specialNeedsFlag: 'ya', specialNeeds: '' }],
    ['RT_RW_TIDAK_TERBACA', { ...valid, address: 'Jl. Tanpa RW' }],
    ['WILAYAH_TIDAK_DIKENAL', { ...valid, kelurahan: '' }],
  ];
  it.each(cases)('%s', (code, raw) => {
    const result = validateResidentRow(raw, TODAY);
    expect(result.value).toBeNull();
    expect(result.errors.map((e) => e.code)).toContain(code);
    for (const e of result.errors) {
      expect(e.column).toBeGreaterThan(0);
      expect(e.message.startsWith(IMPORT_ERROR_CODES[e.code])).toBe(true);
    }
  });

  it('tanggal lahir di masa depan ditolak', () => {
    expect(codes({ ...valid, birthDate: '01/01/2027' })).toContain('TANGGAL_TIDAK_SAH');
  });

  it('kepala dan anggota sama-sama terisi ditolak', () => {
    expect(codes({ ...valid, memberName: 'Ani' })).toContain('PILIHAN_TIDAK_SAH');
  });

  it('kondisi ekonomi dan berkebutuhan khusus di luar pilihan ditolak', () => {
    expect(codes({ ...valid, economy: 'sedang' })).toContain('PILIHAN_TIDAK_SAH');
    expect(codes({ ...valid, specialNeedsFlag: 'mungkin' })).toContain('PILIHAN_TIDAK_SAH');
  });

  it('melaporkan semua galat sekaligus, bukan hanya yang pertama', () => {
    expect(codes({ ...valid, nik: '1', kk: '2', gender: '?' })).toEqual(expect.arrayContaining(['NIK_PANJANG', 'KK_PANJANG', 'PILIHAN_TIDAK_SAH']));
  });
});

describe('pengurai nilai sel', () => {
  it('jenis kelamin, ekonomi, ya/tidak, centang', () => {
    expect(parseGender('Perempuan')).toBe('P');
    expect(parseGender('l')).toBe('L');
    expect(parseEconomy('MISKIN')).toBe(true);
    expect(parseEconomy('Tidak Miskin')).toBe(false);
    expect(parseYesNo('Ya')).toBe(true);
    for (const v of ['v', 'x', '✓', '1', 'ya']) expect(parseCheck(v)).toBe(true);
    expect(parseCheck('')).toBe(false);
    expect(parseCheck('mungkin')).toBeNull();
  });

  it('tanggal dd/mm/yyyy dan yyyy-mm-dd; tanggal mustahil ditolak', () => {
    expect(parseDate('5/1/2001')).toBe('2001-01-05');
    expect(parseDate('2001-01-05')).toBe('2001-01-05');
    expect(parseDate('30/02/2001')).toBeNull();
    expect(parseDate('kemarin')).toBeNull();
  });

  it('RT/RW dari alamat dengan berbagai ejaan', () => {
    expect(parseRtRwFromAddress('Jl. A RT.005/RW.002')).toEqual({ rt: '5', rw: '2' });
    expect(parseRtRwFromAddress('Gg. B rt 12 rw 3')).toEqual({ rt: '12', rw: '3' });
    expect(parseRtRwFromAddress('Jl. C')).toEqual({ rt: null, rw: null });
  });
});

describe('validateHazardRow (Form 5.A.2)', () => {
  it('menghitung bitmask dari centang', () => {
    const { value } = validateHazardRow({ headName: 'Budi', nik: '6371010101900001', hazard_banjir: 'v', hazard_angin_topan: '✓' });
    expect(value?.hazardMask).toBe((1 << 2) | (1 << 6));
  });

  it('tanpa centang atau nilai centang aneh ditolak', () => {
    expect(validateHazardRow({ headName: 'Budi' }).errors[0]?.code).toBe('PILIHAN_TIDAK_SAH');
    expect(validateHazardRow({ headName: 'Budi', hazard_banjir: 'banyak' }).errors[0]?.code).toBe('PILIHAN_TIDAK_SAH');
  });
});
