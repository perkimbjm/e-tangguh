import {
  ATTRIBUTE_CODES,
  ATTRIBUTE_LABEL,
  OFFICER_POSITIONS,
  POSITION_LABEL,
  type OfficerCardDto,
} from '@etangguh/shared';
import { GitCompare, LayoutGrid, Plus, Search, Table2, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '../../../components/DataTable';
import { PageHeader } from '../../../components/PageHeader';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { OfficerCard } from './OfficerCard';
import { OfficerForm } from './OfficerForm';
import { PickVolunteerDialog } from './PickVolunteerDialog';
import { useOfficerMutations } from './api';
import { readinessBand, useOfficerCards } from './card-api';

const VIEW_KEY = 'etg:petugas-tampilan';
const readView = (): 'galeri' | 'tabel' => {
  try {
    return localStorage.getItem(VIEW_KEY) === 'tabel' ? 'tabel' : 'galeri';
  } catch {
    return 'galeri';
  }
};

export function OfficersPage() {
  const { year, locked } = useFiscalYear();
  const { data = [], isLoading } = useOfficerCards(year);
  const { remove } = useOfficerMutations(year);
  const toast = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState(readView);
  const [q, setQ] = useState('');
  const [position, setPosition] = useState('');
  const [band, setBand] = useState('');
  const [adding, setAdding] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);

  const rows = useMemo(
    () =>
      data.filter(
        (c) =>
          (!q ||
            c.fullName.toLowerCase().includes(q.toLowerCase()) ||
            (c.dutyKelurahanName ?? '').toLowerCase().includes(q.toLowerCase())) &&
          (!position || c.position === position) &&
          (!band || readinessBand(c.attributes.overall).label === band),
      ),
    [data, q, position, band],
  );
  if (!year) return <p role="status">Belum ada tahun anggaran.</p>;

  const changeView = (v: 'galeri' | 'tabel') => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* penyimpanan peramban tidak tersedia */
    }
  };
  const toggle = (id: string) =>
    setCompare((xs) =>
      xs.includes(id) ? xs.filter((x) => x !== id) : xs.length < 3 ? [...xs, id] : xs,
    );
  const columns: Column<OfficerCardDto>[] = [
    {
      key: 'nama',
      header: 'Nama',
      cell: (c) => (
        <Link
          to={`/app/petugas/${c.id}?ta=${year}`}
          className="font-medium text-sungai-800 underline"
        >
          {c.fullName}
        </Link>
      ),
    },
    { key: 'jabatan', header: 'Jabatan', cell: (c) => c.positionLabel },
    { key: 'tugas', header: 'Kelurahan tugas', cell: (c) => c.dutyKelurahanName ?? '-' },
    ...ATTRIBUTE_CODES.map((k) => ({
      key: k,
      header: ATTRIBUTE_LABEL[k].code,
      align: 'right' as const,
      cell: (c: OfficerCardDto) => (c.noData.includes(k) ? '—' : c.attributes.values[k]),
    })),
    {
      key: 'all',
      header: 'Keseluruhan',
      align: 'right',
      cell: (c) => <strong>{c.attributes.overall}</strong>,
    },
    { key: 'pita', header: 'Kesiapan', cell: (c) => readinessBand(c.attributes.overall).label },
    ...(locked
      ? []
      : [
          {
            key: 'aksi',
            header: 'Aksi',
            cell: (c: OfficerCardDto) => (
              <button
                type="button"
                className="text-sm text-red-700 underline"
                onClick={() =>
                  remove.mutate(c.id, {
                    onSuccess: () => toast('Petugas dihapus', 'info'),
                    onError: (e) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat'),
                  })
                }
              >
                Hapus
              </button>
            ),
          },
        ]),
  ];

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow={`Operasi · ${year}`}
        title="Petugas & kartu kesiapan"
        description="Kompetensi dan kesiapan dihitung dari data yang dicatat BPBD dengan rumus terdokumentasi. Klik kartu untuk melihat diagram radar dan dasar perhitungannya."
        actions={
          !locked && (
            <>
              <Link
                to={`/app/impor?ta=${year}&form=5.A.5`}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" aria-hidden /> Impor 5.A.5
              </Link>
              <button
                type="button"
                onClick={() => setAdding((a) => !a)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-sungai-800 px-3 text-sm font-semibold text-white hover:bg-sungai-900"
              >
                <Plus className="h-4 w-4" aria-hidden />{' '}
                {adding ? 'Tutup formulir' : 'Tambah petugas'}
              </button>
            </>
          )
        }
      />
      {adding && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <OfficerForm year={year} onDone={() => setAdding(false)} />
        </div>
      )}
      {!locked && <PickVolunteerDialog year={year} />}

      <div
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        role="search"
      >
        <label className="relative min-w-[220px] flex-1 text-sm">
          <span className="sr-only">Cari nama atau kelurahan</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama atau kelurahan tugas"
            className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3"
          />
        </label>
        <label className="text-sm">
          <span className="sr-only">Jabatan</span>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-2"
          >
            <option value="">Semua jabatan</option>
            {OFFICER_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {POSITION_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="sr-only">Kesiapan</span>
          <select
            value={band}
            onChange={(e) => setBand(e.target.value)}
            className="h-10 rounded-lg border border-slate-300 px-2"
          >
            <option value="">Semua tingkat kesiapan</option>
            {['Kesiapan tinggi', 'Kesiapan menengah', 'Kesiapan awal'].map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
        <div
          className="ml-auto inline-flex rounded-lg border border-slate-300 p-0.5"
          role="group"
          aria-label="Tampilan"
        >
          {(['galeri', 'tabel'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => changeView(v)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm ${view === v ? 'bg-sungai-800 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {v === 'galeri' ? (
                <LayoutGrid className="h-4 w-4" aria-hidden />
              ) : (
                <Table2 className="h-4 w-4" aria-hidden />
              )}
              {v === 'galeri' ? 'Galeri' : 'Tabel'}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-slate-600" role="status">
        {rows.length.toLocaleString('id-ID')} petugas ditampilkan
      </p>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-3xl bg-slate-200 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : view === 'galeri' ? (
        rows.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {rows.map((c) => (
              <OfficerCard
                key={c.id}
                card={c}
                year={year}
                selected={compare.includes(c.id)}
                onToggleCompare={() => toggle(c.id)}
                compareDisabled={compare.length >= 3}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-500">
            Belum ada petugas yang cocok.
          </p>
        )
      ) : (
        <DataTable
          caption="Daftar petugas dan nilai kesiapan"
          rows={rows}
          rowKey={(c) => c.id}
          columns={columns}
        />
      )}

      {compare.length > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-20 mx-auto flex max-w-xl items-center gap-3 rounded-2xl bg-sungai-950 px-4 py-3 text-white shadow-2xl lg:left-[calc(18rem+1rem)]">
          <GitCompare className="h-5 w-5 text-senja-300" aria-hidden />
          <span className="flex-1 text-sm">{compare.length} dipilih (maks. 3)</span>
          <button
            type="button"
            onClick={() => setCompare([])}
            className="rounded-lg px-3 py-2 text-sm text-sungai-100 hover:bg-white/10"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={compare.length < 2}
            onClick={() => navigate(`/app/petugas/bandingkan?ta=${year}&ids=${compare.join(',')}`)}
            className="rounded-lg bg-senja-400 px-4 py-2 text-sm font-bold text-sungai-950 disabled:opacity-50"
          >
            Bandingkan
          </button>
        </div>
      )}
    </div>
  );
}
