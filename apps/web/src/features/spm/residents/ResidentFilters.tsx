import { APPROVAL_STATUSES } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { useKelurahan } from '../../../lib/regions';
import { useSession } from '../../../lib/session';
import { APPROVAL_LABEL } from '../labels';
import type { ResidentFilters as Filters } from './api';

const input = 'mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm';

export function ResidentFilters({
  value,
  onChange,
}: {
  value: Filters;
  onChange(f: Filters): void;
}) {
  const { user } = useSession();
  const { data: kelurahan = [] } = useKelurahan();
  const [draft, setDraft] = useState<Filters>(value);
  const set = (k: keyof Filters, v: string) => setDraft((d) => ({ ...d, [k]: v }));

  function submit(e: FormEvent) {
    e.preventDefault();
    onChange(draft);
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4 sm:grid-cols-3 lg:grid-cols-6"
      role="search"
      aria-label="Saring data warga"
    >
      {user?.role !== 'pendata_kelurahan' && (
        <label className="text-sm">
          Kelurahan
          <select
            className={input}
            value={draft.kelurahan ?? ''}
            onChange={(e) => set('kelurahan', e.target.value)}
          >
            <option value="">Semua</option>
            {kelurahan.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-sm">
        RW
        <input
          className={input}
          inputMode="numeric"
          value={draft.rw ?? ''}
          onChange={(e) => set('rw', e.target.value)}
        />
      </label>
      <label className="text-sm">
        RT
        <input
          className={input}
          inputMode="numeric"
          value={draft.rt ?? ''}
          onChange={(e) => set('rt', e.target.value)}
        />
      </label>
      <label className="text-sm">
        Status
        <select
          className={input}
          value={draft.status ?? ''}
          onChange={(e) => set('status', e.target.value)}
        >
          <option value="">Semua</option>
          {APPROVAL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {APPROVAL_LABEL[s].text}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        Nama
        <input className={input} value={draft.q ?? ''} onChange={(e) => set('q', e.target.value)} />
      </label>
      <label className="text-sm">
        NIK (16 digit, cocok persis)
        <input
          className={input}
          inputMode="numeric"
          autoComplete="off"
          value={draft.nik ?? ''}
          onChange={(e) => set('nik', e.target.value)}
        />
      </label>
      <div className="flex items-end gap-2 sm:col-span-3 lg:col-span-6">
        <button
          type="submit"
          className="rounded-md bg-sungai-800 px-4 py-2 text-sm font-semibold text-white hover:bg-sungai-900"
        >
          Terapkan
        </button>
        <button
          type="button"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm"
          onClick={() => {
            setDraft({});
            onChange({});
          }}
        >
          Atur ulang
        </button>
      </div>
    </form>
  );
}
