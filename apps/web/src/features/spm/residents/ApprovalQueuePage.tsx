import { useState } from 'react';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { useKelurahan } from '../../../lib/regions';
import { ResidentDetailDrawer } from './ResidentDetailDrawer';
import { ResidentsTable } from './ResidentsTable';
import { useApprove, useResidents, useReturn } from './api';

/** Antrean persetujuan operator BPBD: setujui per kelurahan atau baris terpilih; kembalikan dengan catatan. */
export function ApprovalQueuePage() {
  const { year, locked } = useFiscalYear();
  const toast = useToast();
  const { data: kelurahan = [] } = useKelurahan();
  const [kel, setKel] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [note, setNote] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useResidents(year, { status: 'menunggu', kelurahan: kel || undefined });
  const approve = useApprove(year);
  const ret = useReturn(year);
  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat');

  if (!year) return <p role="status">Belum ada tahun anggaran.</p>;
  return (
    <section aria-labelledby="judul-setuju" className="space-y-4">
      <h1 id="judul-setuju" className="text-xl font-semibold">
        Persetujuan data warga · {year}
      </h1>
      {locked && <p className="rounded-md bg-slate-100 p-3 text-sm">Tahun anggaran sudah final.</p>}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="text-sm">
          Kelurahan
          <select value={kel} onChange={(e) => setKel(e.target.value)} className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5">
            <option value="">Semua</option>
            {kelurahan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={locked || !kel || approve.isPending}
          onClick={() => approve.mutate({ kelurahanId: kel }, { onSuccess: (r) => toast(`${r.approved} baris disetujui`, 'sukses'), onError: fail })}
          className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Setujui semua di kelurahan ini
        </button>
        <button
          type="button"
          disabled={locked || selected.size === 0 || approve.isPending}
          onClick={() =>
            approve.mutate(
              { ids: [...selected] },
              {
                onSuccess: (r) => {
                  toast(`${r.approved} baris disetujui`, 'sukses');
                  setSelected(new Set());
                },
                onError: fail,
              },
            )
          }
          className="rounded-md border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-50"
        >
          Setujui terpilih ({selected.size})
        </button>
        <label className="min-w-[240px] flex-1 text-sm">
          Catatan pengembalian
          <input value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5" />
        </label>
        <button
          type="button"
          disabled={locked || selected.size === 0 || note.trim().length < 3 || ret.isPending}
          onClick={() =>
            ret.mutate(
              { ids: [...selected], note },
              {
                onSuccess: (r) => {
                  toast(`${r.returned} baris dikembalikan`, 'info');
                  setSelected(new Set());
                  setNote('');
                },
                onError: fail,
              },
            )
          }
          className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-800 disabled:opacity-50"
        >
          Kembalikan terpilih
        </button>
      </div>
      <ResidentsTable rows={rows} loading={query.isLoading} onOpen={setOpenId} selectable={{ selected, toggle }} />
      {query.hasNextPage && (
        <button type="button" onClick={() => void query.fetchNextPage()} className="rounded-md border border-slate-300 px-4 py-2 text-sm">
          Muat lebih banyak
        </button>
      )}
      <ResidentDetailDrawer year={year} id={openId} locked={locked} onClose={() => setOpenId(null)} />
    </section>
  );
}
