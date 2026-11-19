import type { SnapshotDto } from '@etangguh/shared';
import { DataTable } from '../../../components/DataTable';
import { useSnapshots } from './api';

const kb = (n: number) => `${Math.max(1, Math.round(n / 1024)).toLocaleString('id-ID')} KB`;

export function SnapshotsTable({ year }: { year: number }) {
  const { data = [], isLoading } = useSnapshots(year);
  return (
    <DataTable<SnapshotDto>
      caption={`Arsip finalisasi tahun ${year}`}
      loading={isLoading}
      rows={data}
      rowKey={(r) => String(r.revisionNo)}
      empty="Belum ada arsip finalisasi"
      columns={[
        { key: 'rev', header: 'Revisi', cell: (r) => r.revisionNo },
        {
          key: 'waktu',
          header: 'Difinalkan',
          cell: (r) => new Date(r.createdAt).toLocaleString('id-ID'),
        },
        { key: 'alasan', header: 'Alasan revisi', cell: (r) => r.reason ?? '-' },
        {
          key: 'sha',
          header: 'SHA-256',
          cell: (r) => <code className="break-all text-xs">{r.sha256}</code>,
        },
        {
          key: 'unduh',
          header: 'Arsip',
          cell: (r) => (
            <a
              href={`/api/v1/spm/fiscal-years/${year}/snapshots/${r.revisionNo}/archive`}
              className="text-sky-800 underline"
            >
              Unduh ZIP ({kb(r.archiveSize)})
            </a>
          ),
        },
      ]}
    />
  );
}
