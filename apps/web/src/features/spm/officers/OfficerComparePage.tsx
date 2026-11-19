import { ATTRIBUTE_CODES } from '@etangguh/shared';
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { RadarChart } from '../../../components/charts/RadarChart';
import { PageHeader } from '../../../components/PageHeader';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { AttributeTable } from './AttributeTable';
import { AXES } from './OfficerDetailPage';
import { FormulaNote } from './FormulaNote';
import { OfficerCard } from './OfficerCard';
import { useOfficerCards } from './card-api';

/** Perbandingan hingga tiga petugas dalam satu diagram radar dan tabel. */
export function OfficerComparePage() {
  const { year } = useFiscalYear();
  const [params] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').filter(Boolean).slice(0, 3);
  const { data = [], isLoading } = useOfficerCards(year);
  const cards = ids
    .map((id) => data.find((c) => c.id === id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  if (!year) return null;
  return (
    <div className="space-y-6">
      <Link
        to={`/app/petugas?ta=${year}`}
        className="inline-flex items-center gap-1.5 text-sm text-sungai-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Semua petugas
      </Link>
      <PageHeader
        eyebrow="Petugas & kesiapan"
        title="Bandingkan kesiapan"
        description="Hingga tiga petugas. Gunakan untuk menyusun tim yang saling melengkapi, bukan untuk memeringkat orang."
      />
      {isLoading && <p role="status">Memuat…</p>}
      {!isLoading && cards.length < 2 && (
        <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Pilih minimal dua petugas dari galeri untuk dibandingkan.
        </p>
      )}
      {cards.length >= 2 && (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid items-center gap-6 xl:grid-cols-2">
              <RadarChart
                axes={AXES}
                series={cards.map((c) => ({
                  name: c.fullName,
                  values: ATTRIBUTE_CODES.map((k) => c.attributes.values[k]),
                }))}
              />
              <AttributeTable cards={cards} />
            </div>
            <FormulaNote />
          </section>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <OfficerCard key={c.id} card={c} year={year} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
