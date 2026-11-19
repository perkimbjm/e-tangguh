import { useState } from 'react';
import { SERIES } from './palette';

export interface RadarSeries {
  name: string;
  values: number[];
}

interface Props {
  axes: { code: string; name: string }[];
  series: RadarSeries[];
  max?: number;
  size?: number;
}

/**
 * Diagram radar (spiderweb) SVG. Maksimal 3 seri (slot warna 1-3 tervalidasi). Setiap seri punya
 * legenda berlabel; nilai lengkap selalu tersedia pada tabel pendamping di halaman pemakai.
 */
export function RadarChart({ axes, series, max = 99, size = 320 }: Props) {
  const [hover, setHover] = useState<{ s: number; i: number } | null>(null);
  const c = size / 2;
  const r = c - 46;
  const angle = (i: number) => (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  const point = (i: number, v: number) =>
    [c + Math.cos(angle(i)) * r * (v / max), c + Math.sin(angle(i)) * r * (v / max)] as const;
  const ring = (f: number) => axes.map((_, i) => point(i, max * f).join(',')).join(' ');

  return (
    <figure className="relative mx-auto w-full max-w-[360px]">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full"
        role="img"
        aria-label={`Diagram radar: ${series.map((s) => `${s.name} ${axes.map((a, i) => `${a.code} ${s.values[i]}`).join(', ')}`).join('; ')}`}
      >
        {[0.2, 0.4, 0.6, 0.8, 1].map((f) => (
          <polygon
            key={f}
            points={ring(f)}
            fill={f === 1 ? '#f8fafc' : 'none'}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}
        {axes.map((a, i) => {
          const [x, y] = point(i, max);
          const [lx, ly] = point(i, max * 1.2);
          return (
            <g key={a.code}>
              <line x1={c} y1={c} x2={x} y2={y} stroke="#e2e8f0" />
              <text
                x={lx}
                y={ly - 4}
                textAnchor="middle"
                className="fill-slate-900 text-[11px] font-bold"
              >
                {a.code}
              </text>
              <text x={lx} y={ly + 9} textAnchor="middle" className="fill-slate-500 text-[9px]">
                {a.name}
              </text>
            </g>
          );
        })}
        {series.map((s, si) => {
          const color = SERIES[si % SERIES.length]!;
          const pts = s.values.map((v, i) => point(i, v).join(',')).join(' ');
          return (
            <g key={s.name}>
              <polygon
                points={pts}
                fill={color}
                fillOpacity={series.length > 1 ? 0.12 : 0.2}
                stroke={color}
                strokeWidth={2}
                strokeLinejoin="round"
                className="origin-center animate-[radar_700ms_ease-out] motion-reduce:animate-none"
                style={{ transformOrigin: `${c}px ${c}px` }}
              />
              {s.values.map((v, i) => {
                const [x, y] = point(i, v);
                return (
                  <g
                    key={i}
                    onMouseEnter={() => setHover({ s: si, i })}
                    onMouseLeave={() => setHover(null)}
                  >
                    <circle cx={x} cy={y} r={12} fill="transparent" />
                    <circle cx={x} cy={y} r={4} fill={color} stroke="#fff" strokeWidth={2} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
          {series[hover.s]!.name} · {axes[hover.i]!.name}:{' '}
          <strong>{series[hover.s]!.values[hover.i]}</strong>
        </div>
      )}
      {series.length > 1 && (
        <figcaption className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-slate-700">
          {series.map((s, i) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2.5 w-4 rounded-sm"
                style={{ backgroundColor: SERIES[i] }}
              />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
