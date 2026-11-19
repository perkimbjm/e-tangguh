import { ROLE_LABELS } from '@etangguh/shared';
import { useSession } from '../../lib/session';

export function DashboardPage() {
  const { user } = useSession();
  return (
    <section aria-labelledby="judul-beranda" className="rounded-lg border border-slate-200 bg-white p-6">
      <h1 id="judul-beranda" className="text-xl font-semibold">
        Selamat datang
      </h1>
      <p className="mt-2 text-slate-700">
        Anda masuk sebagai <strong>{user ? ROLE_LABELS[user.role] : '-'}</strong>. Modul pendataan warga, rekap, dan
        ekspor Form 5.A akan tersedia pada menu ini.
      </p>
    </section>
  );
}
