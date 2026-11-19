import type { FiscalYearDto } from '@etangguh/shared';
import { useId } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFiscalYears } from '../lib/fiscal-year';

const STATUS_LABEL: Record<FiscalYearDto['status'], string> = { terbuka: 'terbuka', final: 'final (terkunci)', revisi: 'revisi' };

/** Pemilih tahun anggaran; nilai disimpan pada parameter URL `ta`. */
export function FiscalYearSwitcher() {
  const id = useId();
  const [params, setParams] = useSearchParams();
  const { data: items = [] } = useFiscalYears();
  const current = params.get('ta') ?? (items[0] ? String(items[0].year) : '');

  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="text-slate-600">
        Tahun anggaran
      </label>
      <select
        id={id}
        value={current}
        onChange={(e) => {
          params.set('ta', e.target.value);
          setParams(params);
        }}
        className="rounded-md border border-slate-300 px-2 py-1"
      >
        {items.length === 0 && <option value="">—</option>}
        {items.map((fy) => (
          <option key={fy.id} value={fy.year}>
            {fy.year} · {STATUS_LABEL[fy.status]}
            {fy.revisionNo > 0 ? ` rev. ${fy.revisionNo}` : ''}
          </option>
        ))}
      </select>
    </div>
  );
}
