import type { CompletenessRow } from '@etangguh/shared';
import { DataTable } from '../../../components/DataTable';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { useCompleteness } from './api';

const num = (key: keyof CompletenessRow, header: string) => ({ key, header, align: 'right' as const, cell: (r: CompletenessRow) => r[key] });

export function CompletenessPage() {
  const { year } = useFiscalYear();
  const { data = [], isLoading } = useCompleteness(year);
  const total = data.reduce((a, r) => ({ total: a.total + r.total, pending: a.pending + r.pending, withoutNik: a.withoutNik + r.withoutNik }), { total: 0, pending: 0, withoutNik: 0 });
  return (
    <section aria-labelledby="judul-lengkap" className="space-y-4">
      <h1 id="judul-lengkap" className="text-xl font-semibold">
        Kelengkapan data per kelurahan {year ? `· ${year}` : ''}
      </h1>
      <p className="text-sm text-slate-700">
        Total {total.total} warga aktif, {total.pending} menunggu persetujuan, {total.withoutNik} tanpa NIK. “Belum lengkap” = tanpa nomor KK atau tempat lahir.
      </p>
      <DataTable
        caption="Kelengkapan data per kelurahan"
        loading={isLoading}
        rows={data}
        rowKey={(r) => r.kelurahanId}
        columns={[
          { key: 'kec', header: 'Kecamatan', cell: (r) => r.kecamatanName ?? '-' },
          { key: 'kel', header: 'Kelurahan', cell: (r) => r.kelurahanName },
          num('total', 'Jumlah'),
          num('pending', 'Menunggu'),
          num('returned', 'Dikembalikan'),
          num('incomplete', 'Belum lengkap'),
          num('withoutNik', 'Tanpa NIK'),
        ]}
      />
    </section>
  );
}
