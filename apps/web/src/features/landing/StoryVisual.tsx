import { useMemo } from 'react';
import { VIEW_H, VIEW_W, ZONE_LABELS, buildDots, riverPath, zoneCounts } from './story-layout';

const EASE = 'cubic-bezier(0.22,1,0.36,1)';

/** Visual lengket untuk cerita: titik warga → kawasan rawan → batang rekap → formulir resmi. */
export function StoryVisual({ step }: { step: number }) {
  const dots = useMemo(() => buildDots(), []);
  const counts = useMemo(() => zoneCounts(dots), [dots]);
  const river = useMemo(() => riverPath(), []);
  const asBars = step >= 2;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-sungai-950 shadow-2xl shadow-sungai-950/40">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="h-full w-full" aria-hidden="true">
        <defs>
          <pattern id="kisi" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M20 0 H0 V20" className="fill-none stroke-white/5" />
          </pattern>
        </defs>
        <rect width={VIEW_W} height={VIEW_H} fill="url(#kisi)" />

        {/* Batas kelurahan */}
        <g style={{ opacity: asBars ? 0 : 1, transition: `opacity 600ms ${EASE}` }}>
          {[1, 2, 3, 4].map((i) => (
            <line key={i} x1={30 + i * 68} x2={30 + i * 68} y1={30} y2={270} className="stroke-white/10" strokeDasharray="3 5" />
          ))}
          {ZONE_LABELS.map((l, i) => (
            <text key={l} x={64 + i * 68} y={24} textAnchor="middle" className="fill-sungai-300/70 text-[9px] font-semibold">
              {l}
            </text>
          ))}
        </g>

        {/* Sungai dan kawasan rawan */}
        <g style={{ opacity: step === 1 ? 1 : 0, transition: `opacity 700ms ${EASE}` }}>
          <path d={river} className="fill-none stroke-sungai-500/25" strokeWidth={72} strokeLinecap="round" />
          <path
            d={river}
            className="fill-none stroke-sungai-300"
            strokeWidth={3}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            style={{ strokeDashoffset: step >= 1 ? 0 : 1, transition: `stroke-dashoffset 1400ms ${EASE}` }}
          />
        </g>

        {/* Sumbu rekap */}
        <g style={{ opacity: step === 2 ? 1 : 0, transition: `opacity 600ms ${EASE} ${step === 2 ? '500ms' : '0ms'}` }}>
          <line x1={24} x2={376} y1={262} y2={262} className="stroke-white/30" />
          {counts.map((c, i) => (
            <g key={i}>
              <text x={62 + i * 70} y={278} textAnchor="middle" className="fill-sungai-100 text-[9px] font-semibold">
                {ZONE_LABELS[i]}
              </text>
              <text x={62 + i * 70} y={250 - Math.ceil(c.total / 3) * 12 - 4} textAnchor="middle" className="fill-senja-300 text-[12px] font-bold">
                {c.rawan}/{c.total}
              </text>
            </g>
          ))}
        </g>

        {/* Titik warga */}
        <g>
          {dots.map((d, i) => {
            const pos = asBars ? d.bar : d.map;
            const highlight = step >= 1 && d.rawan;
            return (
              <circle
                key={d.id}
                r={step >= 3 ? 2 : asBars ? 5 : 3.4}
                className={highlight ? 'fill-senja-400' : 'fill-white'}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  opacity: step === 0 ? 0.9 : step >= 3 ? 0.15 : highlight ? 1 : 0.35,
                  transition: `transform 1000ms ${EASE} ${i * 9}ms, opacity 600ms ${EASE}, fill 500ms, r 500ms`,
                }}
              />
            );
          })}
        </g>
      </svg>

      <FormCard visible={step >= 3} />
      <StepBadge step={step} />
    </div>
  );
}

function FormCard({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute inset-x-6 top-1/2 rounded-2xl bg-white p-4 text-sungai-950 shadow-2xl transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:inset-x-10 ${
        visible ? '-translate-y-1/2 opacity-100' : '-translate-y-[30%] opacity-0'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-sungai-700">Form 5.A.3</p>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">✓ Siap ekspor</span>
      </div>
      <p className="mt-1 text-sm font-bold leading-snug">Rekapitulasi warga di kawasan rawan bencana</p>
      <div className="mt-3 grid grid-cols-[1.4fr_repeat(3,1fr)] gap-px overflow-hidden rounded-md bg-slate-200 text-[10px]">
        {['Kelurahan', 'Variasi', 'KK', 'Jiwa'].map((h) => (
          <div key={h} className="bg-sungai-50 px-2 py-1 font-bold">
            {h}
          </div>
        ))}
        {['Kel. A', 'Kel. B', 'Kel. C'].map((k, r) =>
          [k, String(r + 1), '…', '…'].map((v, c) => (
            <div key={`${r}-${c}`} className="bg-white px-2 py-1 tabular-nums">
              {v}
            </div>
          )),
        )}
      </div>
      <div className="mt-3 flex gap-2 text-[10px] font-bold">
        <span className="rounded bg-sungai-800 px-2 py-1 text-white">XLSX</span>
        <span className="rounded bg-senja-400 px-2 py-1 text-sungai-950">PDF</span>
        <span className="ml-auto self-center text-slate-500">angka ilustrasi</span>
      </div>
    </div>
  );
}

const BADGES = ['Data warga', 'Kawasan rawan', 'Rekap otomatis', 'Laporan resmi'];

function StepBadge({ step }: { step: number }) {
  return (
    <div aria-hidden="true" className="absolute left-4 top-4 flex gap-1.5">
      {BADGES.map((b, i) => (
        <span
          key={b}
          className={`h-1.5 rounded-full transition-all duration-500 ${i === step ? 'w-8 bg-senja-400' : 'w-3 bg-white/25'}`}
          title={b}
        />
      ))}
    </div>
  );
}
