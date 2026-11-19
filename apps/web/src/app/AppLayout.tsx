import { ROLE_LABELS } from '@etangguh/shared';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { FiscalYearSwitcher } from '../components/FiscalYearSwitcher';
import { useSession } from '../lib/session';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const name = user?.email?.split('@')[0] ?? user?.phone ?? 'Pengguna';

  return (
    <div className="min-h-screen bg-slate-50">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Lompat ke konten
      </a>
      <Sidebar role={user?.role} open={open} onClose={() => setOpen(false)} />
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <FiscalYearSwitcher />
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-slate-900">{name}</p>
                <p className="text-xs text-slate-500">{user ? ROLE_LABELS[user.role] : ''}</p>
              </div>
              <span
                aria-hidden
                className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-sungai-500 to-sungai-800 text-sm font-bold text-white"
              >
                {name.slice(0, 2).toUpperCase()}
              </span>
              <button
                type="button"
                onClick={() => void logout().then(() => navigate('/masuk'))}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Keluar</span>
              </button>
            </div>
          </div>
        </header>
        <main id="konten" tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
