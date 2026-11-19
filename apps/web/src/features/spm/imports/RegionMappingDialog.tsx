import type { RegionChoice } from '@etangguh/shared';
import { useState } from 'react';

interface Props {
  choices: RegionChoice[];
  busy: boolean;
  onSubmit(mappings: { spelling: string; regionId: string }[]): void;
}

/** Pemilihan padanan wilayah untuk ejaan yang ragu (skor 0,5-0,9); berlaku untuk semua baris berejaan sama. */
export function RegionMappingDialog({ choices, busy, onSubmit }: Props) {
  const pending = choices.filter((c) => !c.chosenId);
  const [picked, setPicked] = useState<Record<string, string>>({});
  if (pending.length === 0) return null;
  return (
    <section
      aria-labelledby="judul-padanan"
      className="rounded-lg border border-amber-300 bg-amber-50 p-4"
    >
      <h2 id="judul-padanan" className="font-semibold text-amber-900">
        Pilih padanan kelurahan
      </h2>
      <p className="text-sm text-amber-900">
        Ejaan berikut tidak persis sama dengan nama kelurahan resmi.
      </p>
      <div className="mt-3 space-y-3">
        {pending.map((c) => (
          <fieldset key={c.spelling}>
            <legend className="text-sm font-medium">Ejaan di berkas: “{c.spelling}”</legend>
            <div className="mt-1 flex flex-wrap gap-3">
              {c.candidates.map((cand) => (
                <label key={cand.id} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="radio"
                    name={`p-${c.spelling}`}
                    value={cand.id}
                    onChange={() => setPicked((p) => ({ ...p, [c.spelling]: cand.id }))}
                  />
                  {cand.name}{' '}
                  <span className="text-xs text-slate-600">
                    (kemiripan {Math.round(cand.score * 100)}%)
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <button
        type="button"
        disabled={busy || Object.keys(picked).length === 0}
        onClick={() =>
          onSubmit(Object.entries(picked).map(([spelling, regionId]) => ({ spelling, regionId })))
        }
        className="mt-3 rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        Terapkan padanan dan validasi ulang
      </button>
    </section>
  );
}
