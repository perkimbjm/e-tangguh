import { ADMIN_ROLES, variationLabel } from '@etangguh/shared';
import { DataTable } from '../../../components/DataTable';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { useSession } from '../../../lib/session';
import { HazardZoneForm } from './HazardZoneForm';
import { useHazardZoneMutations, useHazardZones } from './api';

export function HazardZonesPage() {
  const { year, locked } = useFiscalYear();
  const { user } = useSession();
  const toast = useToast();
  const { data = [], isLoading } = useHazardZones(year);
  const m = useHazardZoneMutations(year);
  const canEdit = !locked && !!user && (ADMIN_ROLES as readonly string[]).includes(user.role);

  return (
    <section aria-labelledby="judul-kawasan" className="space-y-4">
      <h1 id="judul-kawasan" className="text-xl font-semibold">
        Kawasan rawan bencana {year ? `· ${year}` : ''}
      </h1>
      <p className="text-sm text-slate-700">Hanya warga yang tinggal di RT/RW berikut yang dapat dicatat pada Form 5.A.1.</p>
      {canEdit && <HazardZoneForm busy={m.create.isPending} onSubmit={(v) => m.create.mutateAsync(v).then(() => toast('Kawasan rawan ditambahkan', 'sukses'))} />}
      <DataTable
        caption="Daftar kawasan rawan bencana"
        loading={isLoading}
        rows={data}
        rowKey={(r) => r.id}
        columns={[
          { key: 'kel', header: 'Kelurahan', cell: (r) => r.kelurahanName },
          { key: 'rw', header: 'RW', cell: (r) => r.rw },
          { key: 'rt', header: 'RT', cell: (r) => r.rt ?? 'Seluruh RW' },
          { key: 'jenis', header: 'Jenis bencana', cell: (r) => variationLabel(r.hazardMask) },
          { key: 'dasar', header: 'Dasar', cell: (r) => `${r.basis === 'krb' ? 'KRB' : 'Keputusan BPBD'} · ${r.basisRef}` },
          ...(canEdit
            ? [
                {
                  key: 'aksi',
                  header: 'Aksi',
                  cell: (r: (typeof data)[number]) => (
                    <button
                      type="button"
                      className="text-sm text-red-800 underline"
                      onClick={() =>
                        m.remove.mutate(r.id, {
                          onSuccess: () => toast('Kawasan dihapus', 'info'),
                          onError: (e) => toast(e instanceof ApiError ? e.message : 'Gagal (mungkin masih dipakai data warga)', 'galat'),
                        })
                      }
                    >
                      Hapus
                    </button>
                  ),
                },
              ]
            : []),
        ]}
      />
    </section>
  );
}
