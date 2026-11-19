import { EMERGENCY_LABEL, HAZARDS } from '@etangguh/shared';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '../../../components/DataTable';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { EventForm } from './EventForm';
import { isoToWita, useEvents } from './api';

const hazardName = (code: string) => HAZARDS.find((h) => h.code === code)?.name ?? code;

export function EventsPage() {
  const { year, locked } = useFiscalYear();
  const { data = [], isLoading } = useEvents(year);
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  if (!year) return <p role="status">Belum ada tahun anggaran.</p>;
  return (
    <section aria-labelledby="judul-kejadian" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 id="judul-kejadian" className="text-2xl font-bold tracking-tight text-slate-900">
          Kejadian bencana · {year}
        </h1>
        {!locked && (
          <button
            type="button"
            onClick={() => setAdding((a) => !a)}
            className="ml-auto rounded-md bg-sungai-800 px-3 py-2 text-sm font-semibold text-white"
          >
            {adding ? 'Tutup formulir' : 'Catat kejadian'}
          </button>
        )}
      </div>
      {adding && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4">
          <EventForm year={year} onDone={(id) => navigate(`/app/kejadian/${id}?ta=${year}`)} />
        </div>
      )}
      <DataTable
        caption="Daftar kejadian bencana"
        loading={isLoading}
        rows={data}
        rowKey={(r) => r.id}
        columns={[
          {
            key: 'nama',
            header: 'Kejadian',
            cell: (r) => (
              <Link
                to={`/app/kejadian/${r.id}?ta=${year}`}
                className="font-medium text-sky-800 underline"
              >
                {r.name}
              </Link>
            ),
          },
          { key: 'jenis', header: 'Jenis', cell: (r) => hazardName(r.hazardCode) },
          { key: 'waktu', header: 'Waktu (WITA)', cell: (r) => isoToWita(r.occurredAt) },
          { key: 'lokasi', header: 'Lokasi', cell: (r) => r.locationText },
          {
            key: 'darurat',
            header: 'Status darurat',
            cell: (r) => EMERGENCY_LABEL[r.emergencyStatus],
          },
          { key: 'korban', header: 'Terdampak', align: 'right', cell: (r) => r.affectedCount },
          { key: 'petugas', header: 'Petugas', align: 'right', cell: (r) => r.officerCount },
        ]}
      />
    </section>
  );
}
