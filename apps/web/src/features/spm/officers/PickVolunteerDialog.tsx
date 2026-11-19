import { useState } from 'react';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useOfficerMutations } from './api';

/**
 * Menjadikan relawan terverifikasi sebagai petugas tanpa ketik ulang. Modul relawan (fitur 001)
 * belum tersedia; server menjawab 501 dan pesan itu ditampilkan apa adanya.
 */
export function PickVolunteerDialog({ year }: { year: number }) {
  const { fromVolunteer } = useOfficerMutations(year);
  const toast = useToast();
  const [id, setId] = useState('');
  return (
    <details className="rounded-lg border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold">Pilih dari relawan terverifikasi</summary>
      <p className="mt-2 text-sm text-slate-600">Data diri dan sertifikasi diambil dari profil relawan. Membutuhkan modul relawan (fitur 001).</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          ID relawan
          <input value={id} onChange={(e) => setId(e.target.value)} className="mt-1 block w-80 rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs" />
        </label>
        <button
          type="button"
          disabled={!id || fromVolunteer.isPending}
          onClick={() =>
            fromVolunteer.mutate(
              { volunteerId: id },
              { onSuccess: () => toast('Relawan ditambahkan sebagai petugas', 'sukses'), onError: (e) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat') },
            )
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
        >
          Tambahkan
        </button>
      </div>
    </details>
  );
}
