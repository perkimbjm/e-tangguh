import type { IdCardCategory, PhotoFrame } from '@etangguh/shared';
import { HoloStrip, THEME } from './CardArt';
import type { Orientation } from './geometry';

/** Busur lingkaran (derajat, 0 = arah kanan, searah jarum jam). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => {
    const t = (a * Math.PI) / 180;
    return `${(cx + r * Math.cos(t)).toFixed(2)} ${(cy + r * Math.sin(t)).toFixed(2)}`;
  };
  return `M ${p(a0)} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`;
}

/**
 * Tata letak area foto per orientasi (koordinat kartu). Lanskap: panel kanan setinggi kartu
 * dengan tepi kiri melengkung. Potret: panel atas selebar kartu dengan tepi bawah melengkung.
 */
const LAYOUT = {
  landscape: {
    box: { left: 168, top: 0, width: 156, height: 204 },
    clip: 'M 48 0 C 14 62, 42 140, 8 204 L 156 204 L 156 0 Z',
    edge: 'M 216 0 C 182 62, 210 140, 176 204',
    inner: 'M 230 0 C 197 62, 224 140, 191 204',
    face: { cx: 252, cy: 78, r: 54 },
    seal: { right: 10, bottom: 10 },
    zoomScale: 1,
    shade: 'linear-gradient(180deg, rgba(5,15,42,0) 55%, rgba(5,15,42,.7) 100%)',
  },
  portrait: {
    box: { left: 0, top: 0, width: 204, height: 196 },
    clip: 'M 0 0 L 204 0 L 204 150 C 160 182, 74 150, 0 194 Z',
    edge: 'M 0 194 C 74 150, 160 182, 204 150',
    inner: 'M 0 180 C 74 136, 160 168, 204 136',
    face: { cx: 102, cy: 92, r: 62 },
    seal: { right: 11, top: 197 },
    // Area potret lebih lebar sehingga foto sudah tampak ±1,25× lebih besar; disamakan.
    zoomScale: 1.25,
    shade:
      'linear-gradient(180deg, rgba(5,15,42,.78) 0%, rgba(5,15,42,0) 34%, rgba(5,15,42,0) 70%, rgba(5,15,42,.45) 100%)',
  },
} as const;

/**
 * Foto gaya kasual (close-up atau separuh badan) tanpa bingkai kaku: dipotong lengkung,
 * diberi gradasi agar teks tetap terbaca, lalu ditimpa kurva dan busur vektor futuristik.
 */
export function HeroPhoto({
  url,
  initials,
  frame,
  category,
  orientation,
  year,
}: {
  url: string | null;
  initials: string;
  frame: PhotoFrame;
  category: IdCardCategory;
  orientation: Orientation;
  year: number;
}) {
  const L = LAYOUT[orientation];
  const t = THEME[category];
  const { cx, cy, r } = L.face;
  const zoom = Math.max(1, frame.zoom / L.zoomScale);
  return (
    <>
      <div
        className="absolute overflow-hidden"
        style={{ ...L.box, clipPath: `path('${L.clip}')` }}
        aria-hidden
      >
        {url ? (
          <img
            src={url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${frame.x}% ${frame.y}%`,
              transform: `scale(${zoom})`,
              transformOrigin: `${frame.x}% ${frame.y}%`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0 grid place-items-center"
            style={{ background: 'linear-gradient(160deg,#2f7de1 0%,#0f3d8c 55%,#050f2a 100%)' }}
          >
            <span className="text-[44px] font-extrabold tracking-tight text-white/90">
              {initials}
            </span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(150deg, rgba(47,125,225,.28) 0%, rgba(47,125,225,0) 42%, rgba(247,147,30,0) 70%, rgba(247,147,30,.22) 100%)',
          }}
        />
        <div className="absolute inset-0" style={{ background: L.shade }} />
      </div>

      <svg
        className="pointer-events-none absolute inset-0"
        width="100%"
        height="100%"
        aria-hidden
        fill="none"
        strokeLinecap="round"
      >
        <defs>
          <linearGradient id={`edge-${orientation}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffb85c" />
            <stop offset="0.5" stopColor="#f7931e" />
            <stop offset="1" stopColor="#f26b0f" />
          </linearGradient>
        </defs>
        <path d={L.edge} stroke={`url(#edge-${orientation})`} strokeWidth="2.4" />
        <path d={L.inner} stroke="#5aa9ff" strokeWidth="0.8" strokeOpacity="0.85" />
        <path d={L.inner} stroke="#ffffff" strokeWidth="0.4" strokeOpacity="0.5" strokeDasharray="1 5" transform="translate(6 0)" />
        <path d={arc(cx, cy, r, -150, 40)} stroke="#ffffff" strokeOpacity="0.55" strokeWidth="0.7" />
        <path d={arc(cx, cy, r + 7, -60, 110)} stroke={t.accent} strokeOpacity="0.9" strokeWidth="1.2" />
        <path d={arc(cx, cy, r + 13, 150, 250)} stroke="#5aa9ff" strokeOpacity="0.7" strokeWidth="0.6" strokeDasharray="2 3" />
        <circle cx={cx + (r + 7) * Math.cos((110 * Math.PI) / 180)} cy={cy + (r + 7) * Math.sin((110 * Math.PI) / 180)} r="1.6" fill={t.accent} />
        <circle cx={cx + r * Math.cos((-150 * Math.PI) / 180)} cy={cy + r * Math.sin((-150 * Math.PI) / 180)} r="1.2" fill="#ffffff" />
      </svg>

      <div className="absolute flex items-center gap-[4px]" style={L.seal}>
        <span className="rounded-full border border-white/30 bg-[#050f2a]/70 px-[6px] py-[2px] text-[5.8px] font-bold tracking-[0.18em] text-white">
          TA {year}
        </span>
        <span className="relative block h-[16px] w-[16px] overflow-hidden rounded-[4px] border border-white/40 bg-white/10">
          <HoloStrip style={{ inset: 0, opacity: 0.9 }} />
        </span>
      </div>
    </>
  );
}
