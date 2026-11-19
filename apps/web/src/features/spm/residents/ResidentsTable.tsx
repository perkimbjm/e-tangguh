import { type ResidentListItem, variationLabel } from '@etangguh/shared';
import { DataTable, type Column } from '../../../components/DataTable';
import { AGE_LABEL, StatusBadge } from '../labels';

interface Props {
  rows: ResidentListItem[];
  loading?: boolean;
  onOpen(id: string): void;
  selectable?: { selected: Set<string>; toggle(id: string): void };
}

export function ResidentsTable({ rows, loading, onOpen, selectable }: Props) {
  const columns: Column<ResidentListItem>[] = [
    ...(selectable
      ? [
          {
            key: 'pick',
            header: 'Pilih',
            cell: (r: ResidentListItem) => (
              <input type="checkbox" aria-label={`Pilih ${r.fullName}`} checked={selectable.selected.has(r.id)} onChange={() => selectable.toggle(r.id)} className="h-4 w-4" />
            ),
          },
        ]
      : []),
    {
      key: 'name',
      header: 'Nama',
      cell: (r) => (
        <button type="button" onClick={() => onOpen(r.id)} className="text-left font-medium text-sky-800 underline-offset-2 hover:underline">
          {r.fullName}
          {r.isFamilyHead && <span className="ml-1 text-xs text-slate-500">(KK)</span>}
        </button>
      ),
    },
    { key: 'nik', header: 'NIK', cell: (r) => <span className="font-mono text-xs">{r.nikMasked ?? <em className="not-italic text-amber-800">belum ada</em>}</span> },
    { key: 'jk', header: 'L/P', cell: (r) => r.gender },
    { key: 'wil', header: 'Kelurahan · RW/RT', cell: (r) => `${r.kelurahanName} · ${r.rw}/${r.rt ?? '-'}` },
    { key: 'umur', header: 'Kelompok umur', cell: (r) => AGE_LABEL[r.ageGroup] },
    { key: 'rawan', header: 'Kerawanan', cell: (r) => <span className="text-xs">{variationLabel(r.hazardMask)}</span> },
    { key: 'status', header: 'Status', cell: (r) => (r.isActive ? <StatusBadge status={r.approvalStatus} /> : <span className="text-xs text-slate-500">Nonaktif</span>) },
  ];
  return <DataTable caption="Daftar warga kawasan rawan bencana" columns={columns} rows={rows} rowKey={(r) => r.id} loading={loading} />;
}
