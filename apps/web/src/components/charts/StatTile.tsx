import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: ReactNode;
  tone?: 'sungai' | 'senja' | 'slate' | 'rose';
}

const TONE = {
  sungai: 'bg-sungai-50 text-sungai-700',
  senja: 'bg-amber-50 text-amber-700',
  slate: 'bg-slate-100 text-slate-700',
  rose: 'bg-rose-50 text-rose-700',
};

/** Angka utama dengan ikon dan keterangan; bukan diagram. */
export function StatTile({ label, value, icon: Icon, hint, tone = 'sungai' }: Props) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${TONE[tone]}`}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">
          {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
        </p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}
