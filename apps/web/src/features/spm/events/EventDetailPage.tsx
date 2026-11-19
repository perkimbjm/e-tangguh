import { EMERGENCY_LABEL, HAZARDS } from '@etangguh/shared';
import { Link, useParams } from 'react-router-dom';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { ExportButton } from '../exports/ExportButton';
import { AffectedTable } from './AffectedTable';
import { EventOfficersTable } from './EventOfficersTable';
import { isoToWita, useEvent } from './api';

export function EventDetailPage() {
  const { id } = useParams();
  const { year, locked } = useFiscalYear();
  const { data, isLoading, error } = useEvent(year, id);
  if (!year || !id) return null;
  if (isLoading) return <p role="status">Memuat…</p>;
  if (error || !data)
    return (
      <p role="alert" className="text-red-700">
        {(error as Error)?.message ?? 'Kejadian tidak ditemukan'}
      </p>
    );
  const exportUrlEvent = (code: string) => (
    <ExportButton
      key={code}
      year={year}
      formCode={code}
      format="xlsx"
      event={id}
      label={`Form ${code}`}
    />
  );
  return (
    <section aria-labelledby="judul-detail-kejadian" className="space-y-6">
      <div>
        <Link to={`/app/kejadian?ta=${year}`} className="text-sm text-sky-800 underline">
          ← Daftar kejadian
        </Link>
        <h1 id="judul-detail-kejadian" className="mt-1 text-xl font-semibold">
          {data.name}
        </h1>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline text-slate-600">Jenis: </dt>
            <dd className="inline">{HAZARDS.find((h) => h.code === data.hazardCode)?.name}</dd>
          </div>
          <div>
            <dt className="inline text-slate-600">Lokasi: </dt>
            <dd className="inline">
              {data.locationText}
              {data.kelurahanName ? ` · ${data.kelurahanName}` : ''}
            </dd>
          </div>
          <div>
            <dt className="inline text-slate-600">Kejadian: </dt>
            <dd className="inline">{isoToWita(data.occurredAt)} WITA</dd>
          </div>
          <div>
            <dt className="inline text-slate-600">Laporan diterima: </dt>
            <dd className="inline">{isoToWita(data.reportedAt)} WITA</dd>
          </div>
          <div>
            <dt className="inline text-slate-600">Status darurat: </dt>
            <dd className="inline font-semibold">{EMERGENCY_LABEL[data.emergencyStatus]}</dd>
          </div>
        </dl>
        <div className="mt-3 flex flex-wrap gap-2">
          {['5.A.9', '5.A.10', '5.A.11'].map(exportUrlEvent)}
        </div>
      </div>
      <AffectedTable year={year} eventId={id} locked={locked} />
      <EventOfficersTable year={year} eventId={id} locked={locked} />
    </section>
  );
}
