import { BPBD_ROLES, ROLE_LABELS } from '@etangguh/shared';
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { FiscalYearSwitcher } from '../components/FiscalYearSwitcher';
import { useSession } from '../lib/session';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-md px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${
    isActive ? 'bg-sky-100 text-sky-900' : 'text-slate-700 hover:bg-slate-100'
  }`;

export function AppLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const ta = params.get('ta');
  const isBpbd = !!user && (BPBD_ROLES as readonly string[]).includes(user.role);
  const links = [
    { to: '/app', label: 'Beranda', end: true },
    { to: '/app/warga', label: 'Data warga' },
    { to: '/app/impor', label: 'Unggah lembar kerja' },
    ...(isBpbd ? [{ to: '/app/persetujuan', label: 'Persetujuan' }, { to: '/app/petugas', label: 'Petugas' }, { to: '/app/kejadian', label: 'Kejadian bencana' }] : []),
    { to: '/app/kelengkapan', label: 'Kelengkapan' },
    { to: '/app/kawasan-rawan', label: 'Kawasan rawan' },
    { to: '/app/rekap', label: 'Rekapitulasi' },
    { to: '/app/ekspor', label: 'Ekspor formulir' },
  ];

  return (
    <div className="min-h-screen">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Lompat ke konten
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <span className="text-lg font-bold text-sky-900">e-Tangguh</span>
          <FiscalYearSwitcher />
          <div className="ml-auto flex items-center gap-3 text-sm">
            {user && <span className="text-slate-600">{ROLE_LABELS[user.role]}</span>}
            <button
              type="button"
              onClick={() => void logout().then(() => navigate('/masuk'))}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"
            >
              Keluar
            </button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-4 md:grid-cols-[200px_1fr]">
        <nav aria-label="Menu utama">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink to={ta ? `${l.to}?ta=${ta}` : l.to} end={l.end} className={navClass}>
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="konten" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
