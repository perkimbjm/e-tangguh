import { useState } from 'react';
import { MAGNITUDE, fmt } from './palette';

/** Kolom vertikal (mis. kejadian per bulan) dengan tooltip saat disorot. */
export function ColumnChart({
  labels,
  values,
  unit = '',
}: {
  labels: string[];
  values: number[];
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  const W = 480;
  const H = 180;
  const pad = { l: 28, r: 8, t: 12, b: 24 };
  const bw = (W - pad.l - pad.r) / values.length;
  const ticks = [0, Math.ceil(max / 2), max];
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={labels.map((l, i) => `${l} ${values[i]}`).join(', ')}
      >
        {ticks.map((t) => {
          const y = H - pad.b - (t / max) * (H - pad.t - pad.b);
          return (
            <g key={t}>
              <line
                x1={pad.l}
                x2={W - pad.r}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray={t ? '3 4' : undefined}
              />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" className="fill-slate-400 text-[10px]">
                {t}
              </text>
            </g>
          );
        })}
        {values.map((v, i) => {
          const h = (v / max) * (H - pad.t - pad.b);
          const x = pad.l + i * bw + 3;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect
                x={pad.l + i * bw}
                y={pad.t}
                width={bw}
                height={H - pad.t - pad.b}
                fill="transparent"
              />
              {v > 0 && (
                <path
                  d={`M${x},${H - pad.b} v${-Math.max(h - 4, 0)} q0,-4 4,-4 h${bw - 14} q4,0 4,4 v${Math.max(h - 4, 0)} z`}
                  fill={MAGNITUDE}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              <text
                x={pad.l + i * bw + bw / 2}
                y={H - 8}
                textAnchor="middle"
                className="fill-slate-500 text-[10px]"
              >
                {labels[i]}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{
            left: `${((pad.l + hover * bw + bw / 2) / W) * 100}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {labels[hover]}: <strong>{fmt(values[hover]!)}</strong>
          {unit}
        </div>
      )}
    </div>
  );
}
