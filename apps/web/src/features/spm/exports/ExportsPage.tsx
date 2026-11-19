import { BPBD_ROLES } from '@etangguh/shared';
import { useState } from 'react';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { useKelurahan } from '../../../lib/regions';
import { useSession } from '../../../lib/session';
import { ExportButton } from './ExportButton';

const FORMS = [
  { code: '5.A.1', title: 'Daftar warga di kawasan rawan bencana', personal: true },
  { code: '5.A.2', title: 'Kerawanan tempat tinggal warga', personal: true },
  { code: '5.A.3', title: 'Rekapitulasi kelompok warga menurut kelompok kerawanan' },
  { code: '5.A.4', title: 'Rekapitulasi aparatur dan warga di kawasan rawan' },
  { code: '5.A.5', title: 'Daftar petugas operasi' },
  { code: '5.A.6', title: 'Rekapitulasi warga dan petugas per jenis bencana' },
];

export function ExportsPage() {
  const { year } = useFiscalYear();
  const { user } = useSession();
  const { data: kelurahan = [] } = useKelurahan();
  const [kel, setKel] = useState('');
  const isBpbd = !!user && (BPBD_ROLES as readonly string[]).includes(user.role);
  if (!year) return <p role="status">Belum ada tahun anggaran.</p>;
  const forms = isBpbd ? FORMS : FORMS.filter((f) => f.personal);

  return (
    <section aria-labelledby="judul-ekspor" className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <h1 id="judul-ekspor" className="text-xl font-semibold">
          Ekspor formulir resmi · {year}
        </h1>
        {isBpbd && (
          <a href={`/api/v1/spm/${year}/forms/export-all`} className="ml-auto rounded-md bg-sky-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-900">
            Unduh paket seluruh Form 5.A (ZIP)
          </a>
        )}
      </div>
      <p className="text-sm text-slate-700">
        Susunan dan penomoran kolom mengikuti formulir resmi. Hanya data disetujui dan aktif yang dimuat. Setiap unduhan tercatat di jejak audit.
        {!isBpbd && ' NIK dan nomor KK disamarkan pada ekspor pendata kelurahan.'}
      </p>
      {isBpbd && (
        <label className="block text-sm">
          Saring daftar perorangan (5.A.1, 5.A.2) per kelurahan
          <select value={kel} onChange={(e) => setKel(e.target.value)} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5">
            <option value="">Seluruh kota</option>
            {kelurahan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {forms.map((f) => (
          <li key={f.code} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-[240px] flex-1">
              <p className="font-semibold">Form {f.code}</p>
              <p className="text-sm text-slate-600">{f.title}</p>
            </div>
            <ExportButton year={year} formCode={f.code} format="xlsx" kelurahan={f.personal ? kel || undefined : undefined} />
            <ExportButton year={year} formCode={f.code} format="pdf" kelurahan={f.personal ? kel || undefined : undefined} />
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-600">Form 5.A.7-5.A.12 tersedia setelah modul kejadian dan inventaris selesai.</p>
    </section>
  );
}
