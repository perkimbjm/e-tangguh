import { MAGNITUDE, fmt } from './palette';

interface Item {
  label: string;
  value: number;
  hint?: string;
}

/** Batang horizontal satu rona, label langsung; urut menurun bila `sorted`. */
export function BarList({
  items,
  sorted = true,
  max: maxProp,
  unit = '',
}: {
  items: Item[];
  sorted?: boolean;
  max?: number;
  unit?: string;
}) {
  const data = sorted ? [...items].sort((a, b) => b.value - a.value) : items;
  const max = maxProp ?? Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0)
    return <p className="py-6 text-center text-sm text-slate-500">Belum ada data</p>;
  return (
    <ul className="space-y-2.5" role="list">
      {data.map((d) => (
        <li
          key={d.label}
          className="group"
          title={`${d.label}: ${fmt(d.value)}${unit}${d.hint ? ` · ${d.hint}` : ''}`}
        >
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-slate-700">{d.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">
              {fmt(d.value)}
              {unit}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out group-hover:brightness-110 motion-reduce:transition-none"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: MAGNITUDE,
                minWidth: d.value > 0 ? 4 : 0,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
