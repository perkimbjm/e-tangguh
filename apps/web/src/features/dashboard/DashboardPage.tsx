import { ROLE_LABELS } from '@etangguh/shared';
import {
  AlertTriangle,
  CheckCircle2,
  Home,
  Lock,
  ShieldCheck,
  Siren,
  Users,
  UserRoundSearch,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarList } from '../../components/charts/BarList';
import { ChartCard } from '../../components/charts/ChartCard';
import { SERIES } from '../../components/charts/palette';
import { SegmentBar } from '../../components/charts/SegmentBar';
import { StatTile } from '../../components/charts/StatTile';
import { PageHeader } from '../../components/PageHeader';
import { useFiscalYear } from '../../lib/fiscal-year';
import { useSession } from '../../lib/session';
import { OperationsSection } from './OperationsSection';
import { useDashboard } from './api';

const STATUS = {
  terbuka: { text: 'Terbuka', cls: 'bg-emerald-100 text-emerald-800' },
  revisi: { text: 'Revisi', cls: 'bg-amber-100 text-amber-800' },
  final: { text: 'Final · terkunci', cls: 'bg-slate-200 text-slate-800' },
};

export function DashboardPage() {
  const { user } = useSession();
  const { year } = useFiscalYear();
  const { data: d, isLoading, error } = useDashboard(year);
  if (!year) return <p role="status">Belum ada tahun anggaran yang dibuka.</p>;
  if (isLoading) return <DashboardSkeleton />;
  if (error || !d)
    return (
      <p role="alert" className="text-red-700">
        {(error as Error)?.message ?? 'Gagal memuat dasbor'}
      </p>
    );

  const r = d.residents;
  const pct = r.total ? Math.round((r.approved / r.total) * 100) : 0;
  const st = STATUS[d.status];
  const ages = [
    { label: 'Balita (< 5 th)', value: d.ageGroups.balita },
    { label: 'Anak (5-17 th)', value: d.ageGroups.anak },
    { label: 'Dewasa', value: d.ageGroups.dewasa },
    { label: 'Lansia (≥ 60 th)', value: d.ageGroups.lansia },
  ];
  const kel = d.byKelurahan.map((k) => ({
    label: k.name,
    value: k.approved,
    hint: `${k.pending} menunggu`,
  }));
  const hazards = d.byHazard
    .filter((h) => h.persons > 0)
    .map((h) => ({ label: h.name, value: h.persons }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Tahun anggaran ${d.year}`}
        title="Ringkasan kesiapsiagaan"
        description={
          <>
            Masuk sebagai <strong>{user ? ROLE_LABELS[user.role] : ''}</strong>. Angka dihitung
            langsung dari data rincian; hanya data disetujui yang masuk rekap.
          </>
        }
        actions={
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${st.cls}`}
          >
            {d.status === 'final' ? (
              <Lock className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {st.text}
            {d.revisionNo > 0 ? ` · revisi ${d.revisionNo}` : ''}
          </span>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Warga kawasan rawan (disetujui)"
          value={r.approved}
          icon={Users}
          hint={`dari ${r.total.toLocaleString('id-ID')} tercatat · ${pct}%`}
        />
        <StatTile
          label="Kepala keluarga"
          value={r.families}
          icon={Home}
          hint={`${r.poorFamilies.toLocaleString('id-ID')} KK miskin`}
          tone="slate"
        />
        <StatTile
          label="Kelompok rentan"
          value={r.vulnerable}
          icon={UserRoundSearch}
          hint={`${r.specialNeeds.toLocaleString('id-ID')} berkebutuhan khusus`}
          tone="senja"
        />
        {d.officers ? (
          <StatTile
            label="Petugas & aparatur"
            value={d.officers.total}
            icon={ShieldCheck}
            hint={
              <Link to={`/app/petugas?ta=${year}`} className="text-sungai-700 underline">
                Lihat kartu kesiapan
              </Link>
            }
            tone="slate"
          />
        ) : (
          <StatTile
            label="Kawasan rawan (RT/RW)"
            value={d.hazardZones}
            icon={AlertTriangle}
            tone="rose"
          />
        )}
      </div>

      {r.pending > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
          <span className="flex-1">
            <strong>{r.pending.toLocaleString('id-ID')}</strong> baris warga menunggu persetujuan
            dan belum masuk rekap. Finalisasi tahun anggaran ditolak sampai antrean kosong.
          </span>
          {d.officers && (
            <Link
              to={`/app/persetujuan?ta=${year}`}
              className="rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700"
            >
              Buka antrean
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Progres persetujuan data warga"
          subtitle={`${r.withoutNik.toLocaleString('id-ID')} warga belum memiliki NIK (tetap terhitung)`}
          table={{
            headers: ['Status', 'Warga'],
            rows: [
              ['Disetujui', r.approved],
              ['Menunggu', r.pending],
              ['Dikembalikan', r.returned],
            ],
          }}
        >
          <div className="flex items-end gap-3">
            <p className="text-4xl font-bold tabular-nums tracking-tight text-slate-900">{pct}%</p>
            <p className="pb-1.5 text-sm text-slate-500">siap dilaporkan</p>
          </div>
          <div className="mt-4">
            <SegmentBar
              segments={[
                { label: 'Disetujui', value: r.approved, color: SERIES[0] },
                { label: 'Menunggu', value: r.pending, color: SERIES[1], pattern: true },
                { label: 'Dikembalikan', value: r.returned, color: '#e34948', pattern: true },
              ]}
            />
          </div>
        </ChartCard>
        <ChartCard
          title="Kelompok umur"
          subtitle="Warga disetujui"
          table={{ headers: ['Kelompok', 'Warga'], rows: ages.map((a) => [a.label, a.value]) }}
        >
          <BarList items={ages} sorted={false} />
        </ChartCard>
        <ChartCard
          className="lg:col-span-2"
          title="Warga per kelurahan"
          subtitle="Disetujui; arahkan kursor untuk jumlah yang menunggu"
          table={{
            headers: ['Kelurahan', 'Disetujui', 'Menunggu'],
            rows: d.byKelurahan.map((k) => [k.name, k.approved, k.pending]),
          }}
        >
          <BarList items={kel} />
        </ChartCard>
        <ChartCard
          title="Warga per jenis bencana"
          subtitle="Satu warga dapat terpapar lebih dari satu jenis"
          table={{
            headers: ['Jenis bencana', 'Warga'],
            rows: d.byHazard.map((h) => [h.name, h.persons]),
          }}
        >
          <BarList items={hazards} />
        </ChartCard>
      </div>

      {d.officers && d.events && (
        <>
          <h2 className="flex items-center gap-2 pt-2 text-lg font-semibold text-slate-900">
            <Siren className="h-5 w-5 text-sungai-700" aria-hidden /> Operasi dan kesiapan
          </h2>
          <OperationsSection officers={d.officers} events={d.events} />
        </>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat dasbor">
      <div className="h-16 w-2/3 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-slate-200 motion-reduce:animate-none" />
    </div>
  );
}
