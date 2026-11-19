import { ATTRIBUTE_CODES, ATTRIBUTE_LABEL, type OfficerCardDto } from '@etangguh/shared';
import { Radio, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { readinessBand } from './card-api';

interface Props {
  card: OfficerCardDto;
  year: number;
  selected?: boolean;
  onToggleCompare?(): void;
  compareDisabled?: boolean;
}

/**
 * Kartu kompetensi dan kesiapan (desain orisinal e-Tangguh). Memuat nama, jabatan, nilai
 * keseluruhan, enam atribut, ketersediaan, dan penugasan; tanpa NIK, kontak, atau data kesehatan.
 */
export function OfficerCard({ card, year, selected, onToggleCompare, compareDisabled }: Props) {
  const band = readinessBand(card.attributes.overall);
  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-sungai-950 via-sungai-900 to-sungai-700 p-[2px] shadow-lg shadow-sungai-950/20 transition duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        selected ? 'ring-4 ring-senja-400' : ''
      }`}
      aria-label={`Kartu ${card.fullName}, nilai keseluruhan ${card.attributes.overall}, ${band.label}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${band.ring} opacity-60`} aria-hidden />
      <div className="relative flex flex-1 flex-col rounded-[22px] bg-gradient-to-b from-sungai-950 to-sungai-900 p-4 text-white">
        <svg
          viewBox="0 0 200 60"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full opacity-30"
          aria-hidden
        >
          <path
            d="M0 30 C 40 10 60 50 100 30 S 160 10 200 30 V60 H0Z"
            className="fill-sungai-500"
          />
          <path
            d="M0 42 C 40 25 70 58 100 42 S 165 25 200 42 V60 H0Z"
            className="fill-sungai-700"
          />
        </svg>
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-5xl font-black leading-none tabular-nums tracking-tight">
              {card.attributes.overall}
            </p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-sungai-300">
              Kesiapan
            </p>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${band.chip}`}
          >
            {band.label}
          </span>
        </div>
        <div className="relative mt-3 flex items-center gap-3">
          <span
            className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${band.ring} p-[2px]`}
          >
            <span className="grid h-full w-full place-items-center rounded-[14px] bg-sungai-800 text-xl font-extrabold">
              {card.initials}
            </span>
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">
              <Link
                to={`/app/petugas/${card.id}?ta=${year}`}
                className="after:absolute after:inset-0 focus-visible:outline-none"
              >
                {card.fullName}
              </Link>
            </h3>
            <p className="flex items-center gap-1 truncate text-xs text-sungai-100">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-senja-300" aria-hidden />
              {card.positionLabel}
            </p>
            <p className="truncate text-xs text-sungai-300">
              {card.dutyKelurahanName ? `Tugas: ${card.dutyKelurahanName}` : card.employmentLabel}
            </p>
          </div>
        </div>
        <dl className="relative mt-4 grid grid-cols-3 gap-x-3 gap-y-2">
          {ATTRIBUTE_CODES.map((k) => {
            const v = card.attributes.values[k];
            const none = card.noData.includes(k);
            return (
              <div key={k} title={`${ATTRIBUTE_LABEL[k].name}: ${none ? 'belum ada data' : v}`}>
                <dt className="text-[10px] font-semibold tracking-wider text-sungai-300">
                  {ATTRIBUTE_LABEL[k].code}
                </dt>
                <dd
                  className={`flex items-center gap-1.5 text-lg font-extrabold tabular-nums ${none ? 'text-sungai-300/70' : ''}`}
                >
                  {none ? '—' : v}
                  <span aria-hidden className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <span
                      className="block h-full rounded-full bg-senja-300"
                      style={{ width: `${none ? 0 : v}%` }}
                    />
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${card.availability === 'siaga' ? 'bg-emerald-400/20 text-emerald-200' : 'bg-white/10 text-sungai-100'}`}
          >
            <Radio className="h-3 w-3" aria-hidden />
            {card.availability === 'siaga' ? 'Siaga' : 'Terbatas'}
          </span>
          {card.duties.map((d) => (
            <span
              key={d}
              className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-sungai-100"
            >
              {d}
            </span>
          ))}
        </div>
        {onToggleCompare && (
          <label className="relative z-10 mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-2 self-start rounded-lg bg-white/10 px-3 text-xs font-semibold hover:bg-white/15">
            <input
              type="checkbox"
              checked={!!selected}
              disabled={compareDisabled && !selected}
              onChange={onToggleCompare}
              className="h-4 w-4 accent-amber-400"
            />
            Bandingkan
          </label>
        )}
      </div>
    </article>
  );
}
