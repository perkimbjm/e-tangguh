import type { LoggedIn } from './app';
import { residentBody } from './spm';

/**
 * Data sintetis dengan jumlah yang diketahui (lihat uji rekap). Tanggal acuan umur: 31 Desember
 * tahun anggaran. SM = Sungai Miai, KU = Kuin Utara (keduanya Kec. Banjarmasin Utara contoh).
 */
export async function seedKnownResidents(year: number, op: LoggedIn, pendata: LoggedIn, k: { sungaiMiai: string; kuinUtara: string }) {
  const url = `/api/v1/spm/${year}/residents`;
  let n = 0;
  const add = async (s: LoggedIn, kel: string, o: Record<string, unknown>) => {
    n += 1;
    const res = await s.agent
      .post(url)
      .set('x-csrf-token', s.csrf)
      .send(residentBody(kel, { nik: `99${String(year)}${String(n).padStart(10, '0')}`, fullName: `Warga ${n}`, isPoor: false, ...o }));
    if (res.status !== 201) throw new Error(`Gagal membuat warga ${n}: ${JSON.stringify(res.body)}`);
    return res.body as { id: string; rowVersion: number };
  };
  const kk = (i: number) => `98${String(year)}${String(i).padStart(10, '0')}`;
  // SM RW 1 (banjir): KK1 = A (miskin, kepala), B (anak), C (balita); KK2 = D (kepala, berkebutuhan khusus); E tanpa NIK/KK (lansia).
  await add(op, k.sungaiMiai, { rw: '1', kk: kk(1), isFamilyHead: true, isPoor: true, birthDate: '1985-01-01' });
  await add(op, k.sungaiMiai, { rw: '1', kk: kk(1), isFamilyHead: false, isPoor: true, birthDate: `${year - 13}-06-01` });
  await add(op, k.sungaiMiai, { rw: '1', kk: kk(1), isFamilyHead: false, isPoor: true, birthDate: `${year - 2}-06-01` });
  await add(op, k.sungaiMiai, { rw: '1', kk: kk(2), isFamilyHead: true, hasSpecialNeeds: true, specialNeeds: 'Tunanetra', birthDate: '1970-01-01' });
  await add(op, k.sungaiMiai, { rw: '1', nik: undefined, noNikReason: 'belum direkam', kk: undefined, isFamilyHead: false, birthDate: '1950-01-01' });
  // SM RW 2 (banjir + angin topan): KK3 = G (kepala miskin), H.
  await add(op, k.sungaiMiai, { rw: '2', kk: kk(3), isFamilyHead: true, isPoor: true, birthDate: '1980-01-01' });
  await add(op, k.sungaiMiai, { rw: '2', kk: kk(3), isFamilyHead: false, birthDate: '1982-01-01' });
  // KU RW 1 (gempa): KK4 = I.
  await add(op, k.kuinUtara, { rw: '1', kk: kk(4), isFamilyHead: true, birthDate: '1990-01-01' });
  // Tidak terhitung: menunggu persetujuan, dan nonaktif.
  await add(pendata, k.sungaiMiai, { rw: '1', kk: kk(5), isFamilyHead: true, birthDate: '1991-01-01' });
  const gone = await add(op, k.sungaiMiai, { rw: '1', kk: kk(6), isFamilyHead: true, birthDate: '1992-01-01' });
  await op.agent.post(`${url}/${gone.id}/deactivate`).set('x-csrf-token', op.csrf).send({ reason: 'pindah', date: `${year}-03-01`, rowVersion: gone.rowVersion }).expect(201);
}
