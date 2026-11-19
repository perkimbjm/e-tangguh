import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { ResidentDetailDrawer } from './ResidentDetailDrawer';
import { ResidentFilters } from './ResidentFilters';
import { ResidentForm } from './ResidentForm';
import { ResidentsTable } from './ResidentsTable';
import { type ResidentFilters as Filters, useResidents } from './api';

export function ResidentsPage() {
  const { year, locked } = useFiscalYear();
  const [filters, setFilters] = useState<Filters>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const query = useResidents(year, filters);
  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (!year) return <p role="status">Belum ada tahun anggaran yang dibuka.</p>;
  return (
    <section aria-labelledby="judul-warga" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 id="judul-warga" className="text-2xl font-bold tracking-tight text-slate-900">
          Warga kawasan rawan bencana · {year}
        </h1>
        {!locked && (
          <div className="ml-auto flex gap-2">
            <Link
              to={`/app/impor?ta=${year}`}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              Unggah lembar kerja
            </Link>
            <button
              type="button"
              onClick={() => setAdding((a) => !a)}
              className="rounded-md bg-sungai-800 px-3 py-2 text-sm font-semibold text-white"
            >
              {adding ? 'Tutup formulir' : 'Tambah warga'}
            </button>
          </div>
        )}
      </div>
      {locked && (
        <p className="rounded-md bg-slate-100 px-3 py-2 text-sm">
          Tahun anggaran ini sudah final dan terkunci.
        </p>
      )}
      {adding && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4">
          <h2 className="mb-3 font-semibold">Tambah warga</h2>
          <ResidentForm year={year} onDone={() => setAdding(false)} />
        </div>
      )}
      <ResidentFilters value={filters} onChange={setFilters} />
      {query.error && (
        <p role="alert" className="text-red-700">
          {(query.error as Error).message}
        </p>
      )}
      <ResidentsTable rows={rows} loading={query.isLoading} onOpen={setOpenId} />
      {query.hasNextPage && (
        <button
          type="button"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm"
        >
          {query.isFetchingNextPage ? 'Memuat…' : 'Muat lebih banyak'}
        </button>
      )}
      <ResidentDetailDrawer
        year={year}
        id={openId}
        locked={locked}
        onClose={() => setOpenId(null)}
      />
    </section>
  );
}
