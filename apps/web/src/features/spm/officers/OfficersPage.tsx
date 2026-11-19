import { EMPLOYMENT_LABEL, POSITION_LABEL, type OfficerDto, variationLabel } from '@etangguh/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { OfficerForm } from './OfficerForm';
import { PickVolunteerDialog } from './PickVolunteerDialog';
import { useOfficerMutations, useOfficers } from './api';

const duties = (o: OfficerDto) => [o.isTrcPdb && 'TRC PDB', o.isTrcKlb && 'TRC KLB', o.isPpe && 'PPE', o.isOps && 'Operasi'].filter(Boolean).join(', ') || '-';

export function OfficersPage() {
  const { year, locked } = useFiscalYear();
  const { data = [], isLoading } = useOfficers(year);
  const { remove } = useOfficerMutations(year);
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  if (!year) return <p role="status">Belum ada tahun anggaran.</p>;

  return (
    <section aria-labelledby="judul-petugas" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 id="judul-petugas" className="text-xl font-semibold">Petugas dan aparatur · {year}</h1>
        {!locked && (
          <div className="ml-auto flex gap-2">
            <Link to={`/app/impor?ta=${year}&form=5.A.5`} className="rounded-md border border-slate-300 px-3 py-2 text-sm">Impor Form 5.A.5</Link>
            <button type="button" onClick={() => setAdding((a) => !a)} className="rounded-md bg-sky-800 px-3 py-2 text-sm font-semibold text-white">
              {adding ? 'Tutup formulir' : 'Tambah petugas'}
            </button>
          </div>
        )}
      </div>
      {adding && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <OfficerForm year={year} onDone={() => setAdding(false)} />
        </div>
      )}
      {!locked && <PickVolunteerDialog year={year} />}
      <DataTable
        caption="Daftar petugas dan aparatur"
        loading={isLoading}
        rows={data}
        rowKey={(r) => r.id}
        columns={[
          { key: 'nama', header: 'Nama', cell: (r) => <>{r.fullName}{r.isResident && <span className="ml-1 text-xs text-slate-500">(juga warga)</span>}</> },
          { key: 'nik', header: 'NIK', cell: (r) => <span className="font-mono text-xs">{r.nikMasked ?? 'belum ada'}</span> },
          { key: 'jabatan', header: 'Jabatan', cell: (r) => POSITION_LABEL[r.position] },
          { key: 'status', header: 'Status', cell: (r) => EMPLOYMENT_LABEL[r.employmentStatus] },
          { key: 'tugas', header: 'Kelurahan tugas', cell: (r) => r.dutyKelurahanName ?? '-' },
          { key: 'penugasan', header: 'Penugasan', cell: duties },
          { key: 'bencana', header: 'Jenis bencana', cell: (r) => <span className="text-xs">{r.hazardMask ? variationLabel(r.hazardMask) : '-'}</span> },
          ...(locked
            ? []
            : [
                {
                  key: 'aksi',
                  header: 'Aksi',
                  cell: (r: OfficerDto) => (
                    <button
                      type="button"
                      className="text-sm text-red-800 underline"
                      onClick={() => remove.mutate(r.id, { onSuccess: () => toast('Petugas dihapus', 'info'), onError: (e) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat') })}
                    >
                      Hapus
                    </button>
                  ),
                },
              ]),
        ]}
      />
    </section>
  );
}
