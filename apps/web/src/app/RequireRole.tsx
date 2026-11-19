import type { Role } from '@etangguh/shared';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSession } from '../lib/session';

/**
 * Penjaga rute di antarmuka. Hanya kenyamanan navigasi: otorisasi sebenarnya ditegakkan server
 * (konstitusi Prinsip II).
 */
export function RequireRole({ roles, children }: { roles: readonly Role[]; children: ReactNode }) {
  const { user, loading } = useSession();
  const location = useLocation();
  if (loading) {
    return (
      <p role="status" className="p-6 text-slate-600">
        Memuat sesi…
      </p>
    );
  }
  if (!user) return <Navigate to="/masuk" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-xl font-semibold">Akses ditolak</h1>
        <p className="mt-2 text-slate-700">Peran Anda tidak berwenang membuka halaman ini.</p>
      </main>
    );
  }
  return <>{children}</>;
}
