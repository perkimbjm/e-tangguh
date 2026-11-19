import { describe, expect, it } from 'vitest';
import { validateOfficerRow } from './officer-row';

const base = { fullName: 'Petugas Sintetis', nik: '9900000000000077', gender: 'L', st_tni: 'v', kelurahan: 'Sungai Miai', isTrcPdb: 'v' };

describe('validateOfficerRow', () => {
  it('status TNI tanpa kolom jabatan → Babinsa', () => {
    const { value } = validateOfficerRow(base);
    expect(value).toMatchObject({ employmentStatus: 'tni', position: 'babinsa', isTrcPdb: true, dutyKelurahanName: null });
  });

  it('jabatan relawan dengan status non-aparatur; kelurahan tugas dari kolom bantu', () => {
    const { value } = validateOfficerRow({ ...base, st_tni: '', st_non_aparatur: 'v', position: 'Relawan', dutyKelurahan: 'Kuin Utara' });
    expect(value).toMatchObject({ position: 'relawan', employmentStatus: 'non_aparatur', dutyKelurahanName: 'Kuin Utara' });
  });

  it('tepat satu status wajib; jabatan bertentangan dengan status ditolak', () => {
    expect(validateOfficerRow({ ...base, st_polri: 'v' }).errors[0]?.column).toBe(15);
    expect(validateOfficerRow({ ...base, position: 'bhabinkamtibmas' }).errors[0]?.message).toMatch(/tidak sesuai jabatan/);
  });

  it('posko dan pos lapangan sekaligus ditolak', () => {
    expect(validateOfficerRow({ ...base, post_posko: 'v', post_pos_lapangan: 'v' }).errors[0]?.column).toBe(25);
  });
});
