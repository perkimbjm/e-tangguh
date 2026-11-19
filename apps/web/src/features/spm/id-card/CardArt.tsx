import type { IdCardCategory } from '@etangguh/shared';

/**
 * Skema warna mengikuti warna identitas BPBD (oranye + biru) di atas dasar biru tua.
 * Relawan menonjolkan oranye; petugas menonjolkan biru. Keduanya tetap memuat kedua warna.
 */
export const THEME: Record<
  IdCardCategory,
  { accent: string; accentSoft: string; ribbon: string; label: string }
> = {
  relawan: {
    accent: '#f7931e',
    accentSoft: '#ffb85c',
    ribbon: 'linear-gradient(90deg,#f26b0f,#f7931e 55%,#ffb85c)',
    label: 'RELAWAN KEBENCANAAN',
  },
  petugas: {
    accent: '#5aa9ff',
    accentSoft: '#bcd9ff',
    ribbon: 'linear-gradient(90deg,#2f7de1,#5aa9ff 60%,#9cc9ff)',
    label: 'PETUGAS KEBENCANAAN',
  },
};

/** Latar kartu: gradasi navy, pola guilloche halus (pengaman visual), dan gelombang sungai. */
export function CardBackground({
  w,
  h,
  category,
  seed = 0,
}: {
  w: number;
  h: number;
  category: IdCardCategory;
  seed?: number;
}) {
  const t = THEME[category];
  const lines = Array.from({ length: 14 }, (_, i) => i);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="absolute inset-0" aria-hidden>
      <defs>
        <linearGradient id={`bg-${seed}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#050f2a" />
          <stop offset="0.55" stopColor="#0a2560" />
          <stop offset="1" stopColor="#0f3d8c" />
        </linearGradient>
        <radialGradient id={`glow-${seed}`} cx="0.85" cy="0.1" r="0.7">
          <stop offset="0" stopColor={t.accentSoft} stopOpacity="0.16" />
          <stop offset="1" stopColor={t.accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={w} height={h} fill={`url(#bg-${seed})`} />
      <rect width={w} height={h} fill={`url(#glow-${seed})`} />
      <g fill="none" stroke="#ffffff" strokeOpacity="0.055" strokeWidth="0.5">
        {lines.map((i) => (
          <path
            key={i}
            d={`M ${-20} ${h * 0.2 + i * 9} C ${w * 0.3} ${h * 0.05 + i * 9 + (i % 2) * 6}, ${w * 0.6} ${h * 0.45 + i * 7}, ${w + 20} ${h * 0.15 + i * 9}`}
          />
        ))}
      </g>
      <g
        transform={`translate(${w * (w > h ? 0.62 : 0.5)} ${h * (w > h ? 0.18 : 0.4)}) scale(${(w > h ? h : w) / 34})`}
        opacity="0.07"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
      >
        <path d="M16 3 L28 9 V17 C28 23.5 22.5 28 16 30 C9.5 28 4 23.5 4 17 V9 Z" />
        <path d="M8 19 C11 16.5 13 21.5 16 19 S21 16.5 24 19" />
        <path d="M8 23 C11 20.5 13 25.5 16 23 S21 20.5 24 23" />
      </g>
      <path
        d={`M0 ${h * 0.84} C ${w * 0.25} ${h * 0.74}, ${w * 0.45} ${h * 0.95}, ${w * 0.7} ${h * 0.84} S ${w * 0.95} ${h * 0.76}, ${w} ${h * 0.82} V${h} H0Z`}
        fill="#2f7de1"
        fillOpacity="0.32"
      />
      <rect x="0" y={h - 3.5} width={w * 0.62} height="3.5" fill="#f7931e" />
      <rect x={w * 0.62} y={h - 3.5} width={w * 0.38} height="3.5" fill="#2f7de1" />
    </svg>
  );
}

/** Pita hologram berkilau (dekoratif; berhenti bila gerak dikurangi atau saat diekspor). */
export function HoloStrip({
  className = '',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden
      className={`etg-holo absolute ${className}`}
      style={{
        background:
          'linear-gradient(180deg, rgba(255,236,170,0) 0%, rgba(255,236,170,.55) 18%, rgba(150,200,255,.6) 40%, rgba(255,170,90,.5) 62%, rgba(200,255,220,.55) 82%, rgba(255,255,255,0) 100%)',
        backgroundSize: '100% 250%',
        opacity: 0.55,
        ...style,
      }}
    />
  );
}

export function Shield({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden>
      <path
        d="M16 3 L28 9 V17 C28 23.5 22.5 28 16 30 C9.5 28 4 23.5 4 17 V9 Z"
        fill="#1e63c9"
        stroke="#bcd9ff"
        strokeWidth="1.2"
      />
      <path
        d="M8 19 C11 16.5 13 21.5 16 19 S21 16.5 24 19"
        fill="none"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 23 C11 20.5 13 25.5 16 23 S21 20.5 24 23"
        fill="none"
        stroke="#f7931e"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Lempeng mirip cip kontak (dekoratif), ditempatkan dalam alur tata letak. */
export function Chip() {
  return (
    <div
      aria-hidden
      className="relative shrink-0 rounded-[3px]"
      style={{
        width: 26,
        height: 20,
        background: 'linear-gradient(135deg,#f8e1a0,#c99a3c 55%,#f3d38a)',
        boxShadow: 'inset 0 0 0 0.6px rgba(0,0,0,.35)',
      }}
    >
      <div className="absolute inset-[3px] rounded-[2px] border border-black/25" />
      <div className="absolute left-1/2 top-[3px] h-[14px] w-px -translate-x-1/2 bg-black/25" />
      <div className="absolute left-[3px] right-[3px] top-1/2 h-px -translate-y-1/2 bg-black/25" />
    </div>
  );
}

/** Garis diagonal oranye khas kartu (aksen warna BPBD). */
export function AccentStripe({ style }: { style: React.CSSProperties }) {
  return (
    <div
      aria-hidden
      className="absolute"
      style={{ background: 'linear-gradient(180deg,#ffb85c,#f7931e 50%,#f26b0f)', ...style }}
    />
  );
}
