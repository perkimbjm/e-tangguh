import { Link } from 'react-router-dom';
import { usePageProgress } from './hooks';

const LINKS = [
  { href: '#cerita', label: 'Cara kerja' },
  { href: '#alur', label: 'Alur' },
  { href: '#perlindungan', label: 'Perlindungan data' },
];

export function LandingNav() {
  const progress = usePageProgress();
  const solid = progress > 0.02;
  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid ? 'bg-sungai-950/85 shadow-lg backdrop-blur' : 'bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 text-white">
        <a href="#atas" className="flex items-center gap-2 font-extrabold tracking-tight">
          <Logo />
          <span>
            e-<span className="text-senja-300">Tangguh</span>
          </span>
        </a>
        <nav aria-label="Navigasi beranda" className="ml-auto hidden md:block">
          <ul className="flex gap-6 text-sm text-sungai-100">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="rounded hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-senja-300">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <Link
          to="/masuk"
          className="ml-auto rounded-full bg-senja-400 px-4 py-1.5 text-sm font-bold text-sungai-950 transition hover:bg-senja-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:ml-0"
        >
          Masuk
        </Link>
      </div>
      <div aria-hidden="true" className="h-0.5 origin-left bg-senja-400" style={{ transform: `scaleX(${progress})` }} />
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <path d="M16 3 L28 9 V17 C28 23.5 22.5 28 16 30 C9.5 28 4 23.5 4 17 V9 Z" className="fill-sungai-500" />
      <path d="M8 19 C11 16.5 13 21.5 16 19 S21 16.5 24 19" className="fill-none stroke-white" strokeWidth="2" strokeLinecap="round" />
      <path d="M8 23 C11 20.5 13 25.5 16 23 S21 20.5 24 23" className="fill-none stroke-senja-300" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
