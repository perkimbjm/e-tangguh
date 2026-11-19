import { fmt } from './palette';

interface Segment {
  label: string;
  value: number;
  color: string;
  /** Pola garis untuk pembeda tanpa warna. */
  pattern?: boolean;
}

/** Batang tersegmen 100% (mis. progres persetujuan) dengan legenda berlabel dan jarak 2px antarsegmen. */
export function SegmentBar({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  return (
    <div>
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-slate-100"
        role="img"
        aria-label={segments.map((s) => `${s.label} ${s.value}`).join(', ')}
      >
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${fmt(s.value)} (${Math.round((s.value / total) * 100)}%)`}
                className="h-full first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(s.value / total) * 100}%`,
                  backgroundColor: s.color,
                  backgroundImage: s.pattern
                    ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.45) 0 3px, transparent 3px 7px)'
                    : undefined,
                }}
              />
            ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {segments.map((s) => (
          <li key={s.label} className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-2.5 w-2.5 rounded-sm"
              style={{
                backgroundColor: s.color,
                backgroundImage: s.pattern
                  ? 'repeating-linear-gradient(45deg, rgba(255,255,255,.5) 0 2px, transparent 2px 4px)'
                  : undefined,
              }}
            />
            {s.label} <strong className="tabular-nums text-slate-900">{fmt(s.value)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
