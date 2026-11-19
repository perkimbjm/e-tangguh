import { ATTRIBUTE_CODES, ATTRIBUTE_LABEL, variationLabel } from '@etangguh/shared';
import { ArrowLeft, Info } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { RadarChart } from '../../../components/charts/RadarChart';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { AttributeTable } from './AttributeTable';
import { OfficerCard } from './OfficerCard';
import { FormulaNote } from './FormulaNote';
import { useOfficerCard } from './card-api';

export const AXES = ATTRIBUTE_CODES.map((k) => ({
  code: ATTRIBUTE_LABEL[k].code,
  name: ATTRIBUTE_LABEL[k].name,
}));

export function OfficerDetailPage() {
  const { id } = useParams();
  const { year } = useFiscalYear();
  const { data: card, isLoading, error } = useOfficerCard(year, id);
  if (!year) return null;
  if (isLoading) return <p role="status">Memuat…</p>;
  if (error || !card)
    return (
      <p role="alert" className="text-red-700">
        {(error as Error)?.message ?? 'Petugas tidak ditemukan'}
      </p>
    );
  return (
    <div className="space-y-6">
      <Link
        to={`/app/petugas?ta=${year}`}
        className="inline-flex items-center gap-1.5 text-sm text-sungai-800 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Semua petugas
      </Link>
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <OfficerCard card={card} year={year} />
          <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <div>
              <dt className="text-xs text-slate-500">Sertifikat</dt>
              <dd className="text-xl font-bold">{card.stats.certificates}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Penugasan</dt>
              <dd className="text-xl font-bold">{card.stats.deployments}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Tahun aktif</dt>
              <dd className="text-xl font-bold">{card.stats.yearsActive}</dd>
            </div>
          </dl>
          <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <span className="font-semibold">Jenis bencana ditangani:</span>{' '}
            {card.hazardMask ? variationLabel(card.hazardMask) : '-'}
          </p>
        </div>
        <div className="space-y-6">
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-labelledby="judul-radar"
          >
            <h1 id="judul-radar" className="text-lg font-semibold text-slate-900">
              Profil kompetensi dan kesiapan
            </h1>
            <p className="text-sm text-slate-500">
              {card.positionLabel} · {card.employmentLabel}
            </p>
            <div className="mt-4 grid items-center gap-6 xl:grid-cols-2">
              <RadarChart
                axes={AXES}
                series={[
                  {
                    name: card.fullName,
                    values: ATTRIBUTE_CODES.map((k) => card.attributes.values[k]),
                  },
                ]}
              />
              <AttributeTable cards={[card]} />
            </div>
          </section>
          <section
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-labelledby="judul-dasar"
          >
            <h2 id="judul-dasar" className="flex items-center gap-2 text-base font-semibold">
              <Info className="h-4 w-4 text-sungai-700" aria-hidden /> Dasar perhitungan
            </h2>
            <ul className="mt-3 divide-y divide-slate-100">
              {ATTRIBUTE_CODES.map((k) => (
                <li key={k} className="py-2.5 text-sm">
                  <p className="font-medium text-slate-900">
                    {ATTRIBUTE_LABEL[k].code} · {ATTRIBUTE_LABEL[k].name}:{' '}
                    <span className="tabular-nums">{card.attributes.values[k]}</span>
                  </p>
                  {card.attributes.breakdown[k].length ? (
                    <ul className="mt-1 list-disc pl-5 text-slate-600">
                      {card.attributes.breakdown[k].map((b) => (
                        <li key={b.id}>
                          {b.label} <span className="text-slate-500">(+{b.contribution})</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">
                      {card.noData.includes(k)
                        ? 'Belum ada sumber data pada modul SPM.'
                        : 'Belum ada bukti yang dihitung.'}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <FormulaNote />
          </section>
        </div>
      </div>
    </div>
  );
}
