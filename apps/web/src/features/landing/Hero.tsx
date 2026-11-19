import { Link } from 'react-router-dom';
import { RiverWaves } from './RiverWaves';
import { useReducedMotion, useSectionProgress } from './hooks';

const WORDS = ['Data', 'yang', 'tangguh', 'untuk', 'kota', 'seribu', 'sungai.'];

export function Hero() {
  const [ref, progress] = useSectionProgress<HTMLElement>('leave');
  const reduced = useReducedMotion();
  const shift = reduced ? 0 : progress * 120;
  const fade = reduced ? 1 : 1 - progress * 1.3;

  return (
    <section
      id="atas"
      ref={ref}
      aria-labelledby="judul-hero"
      className="relative flex min-h-[100svh] items-center overflow-hidden bg-gradient-to-b from-sungai-950 via-sungai-900 to-sungai-800 pt-20 text-white"
    >
      <Glow />
      <div
        className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-32"
        style={{ transform: `translateY(${shift}px)`, opacity: fade }}
      >
        <p className="animate-naik text-sm font-semibold uppercase tracking-[0.2em] text-senja-300">
          BPBD Kota Banjarmasin · Standar Pelayanan Minimal
        </p>
        <h1
          id="judul-hero"
          className="mt-4 max-w-4xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
        >
          {WORDS.map((w, i) => (
            <span
              key={i}
              className="mr-[0.25em] inline-block animate-naik"
              style={{ animationDelay: `${150 + i * 90}ms` }}
            >
              {w === 'tangguh' ? (
                <span className="bg-gradient-to-r from-senja-300 to-senja-500 bg-clip-text text-transparent">
                  {w}
                </span>
              ) : (
                w
              )}
            </span>
          ))}
        </h1>
        <p
          className="mt-6 max-w-2xl animate-naik text-lg text-sungai-100 sm:text-xl"
          style={{ animationDelay: '850ms' }}
        >
          e-Tangguh menghimpun data warga kawasan rawan bencana, petugas, kejadian, dan logistik,
          lalu menyusun laporan SPM sub-urusan bencana secara otomatis dan dapat ditelusuri.
        </p>
        <div
          className="mt-8 flex animate-naik flex-wrap gap-3"
          style={{ animationDelay: '1000ms' }}
        >
          <a
            href="#cerita"
            className="rounded-full bg-senja-400 px-6 py-3 font-bold text-sungai-950 shadow-lg shadow-senja-500/20 transition hover:-translate-y-0.5 hover:bg-senja-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Lihat cara kerjanya
          </a>
          <Link
            to="/masuk"
            className="rounded-full border border-white/40 px-6 py-3 font-semibold transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Masuk petugas
          </Link>
        </div>
      </div>
      <ScrollCue hidden={progress > 0.05} />
      <RiverWaves />
    </section>
  );
}

function Glow() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -right-24 top-16 h-96 w-96 rounded-full bg-sungai-500/25 blur-3xl" />
      <div className="absolute -left-32 bottom-24 h-80 w-80 rounded-full bg-senja-500/15 blur-3xl" />
      {[
        [18, 30],
        [72, 22],
        [84, 58],
        [40, 64],
        [60, 40],
      ].map(([x, y], i) => (
        <span
          key={i}
          className="absolute h-2 w-2 animate-denyut rounded-full bg-senja-300"
          style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.5}s` }}
        />
      ))}
    </div>
  );
}

function ScrollCue({ hidden }: { hidden: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute bottom-28 left-1/2 z-10 -translate-x-1/2 transition-opacity duration-500 ${hidden ? 'opacity-0' : 'opacity-80'}`}
    >
      <div className="flex h-10 w-6 justify-center rounded-full border-2 border-white/60 pt-2">
        <span className="h-2 w-1 animate-bounce rounded-full bg-white motion-reduce:animate-none" />
      </div>
    </div>
  );
}
