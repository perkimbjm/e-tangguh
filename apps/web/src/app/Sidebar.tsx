import type { Role } from '@etangguh/shared';
import { X } from 'lucide-react';
import { NavLink, useSearchParams } from 'react-router-dom';
import { NAV } from './nav';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 font-extrabold tracking-tight text-white">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <path
          d="M16 3 L28 9 V17 C28 23.5 22.5 28 16 30 C9.5 28 4 23.5 4 17 V9 Z"
          className="fill-sungai-500"
        />
        <path
          d="M8 19 C11 16.5 13 21.5 16 19 S21 16.5 24 19"
          className="fill-none stroke-white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8 23 C11 20.5 13 25.5 16 23 S21 20.5 24 23"
          className="fill-none stroke-senja-300"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {!compact && (
        <span className="leading-tight">
          e-<span className="text-senja-300">Tangguh</span>
          <span className="block text-[10px] font-medium uppercase tracking-[0.18em] text-sungai-300">
            BPBD Banjarmasin
          </span>
        </span>
      )}
    </span>
  );
}

interface Props {
  role: Role | undefined;
  open: boolean;
  onClose(): void;
}

/** Navigasi utama: tetap di desktop, laci di ponsel. */
export function Sidebar({ role, open, onClose }: Props) {
  const [params] = useSearchParams();
  const ta = params.get('ta');
  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || (role && i.roles.includes(role))),
  })).filter((g) => g.items.length);

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/50 transition-opacity lg:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-gradient-to-b from-sungai-950 via-sungai-950 to-sungai-900 text-sungai-100 transition-transform duration-300 motion-reduce:transition-none lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigasi utama"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-white/10 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-6 pt-2">
          {groups.map((g) => (
            <div key={g.group}>
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-sungai-300/80">
                {g.group}
              </p>
              <ul className="space-y-0.5">
                {g.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={ta ? `${to}?ta=${ta}` : to}
                      end={end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `group flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-senja-300 ${
                          isActive
                            ? 'bg-white/10 text-white shadow-inner'
                            : 'text-sungai-100/80 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? 'bg-senja-400 text-sungai-950' : 'bg-white/5 text-sungai-300 group-hover:text-white'}`}
                          >
                            <Icon className="h-4 w-4" aria-hidden />
                          </span>
                          {label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <p className="border-t border-white/10 px-5 py-4 text-[11px] text-sungai-300/80">
          Data SPM sub-urusan bencana · Permendagri 101/2018
        </p>
      </aside>
    </>
  );
}
