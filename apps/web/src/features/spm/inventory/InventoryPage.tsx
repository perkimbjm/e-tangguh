import { SUPPORT_KEYS, SUPPORT_LABEL } from '@etangguh/shared';
import { DataTable, type Column } from '../../../components/DataTable';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { ExportButton } from '../exports/ExportButton';
import { InventoryForm } from './InventoryForm';
import { type InventoryItem, type InventoryKind, useInventory, useInventoryMutations } from './api';

const num = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });

/** Halaman bersama 5.A.7 (peralatan) dan 5.A.8 (stok logistik). */
export function InventoryPage({ kind }: { kind: InventoryKind }) {
  const { year, locked } = useFiscalYear();
  const { data = [], isLoading } = useInventory(kind, year);
  const { remove } = useInventoryMutations(kind, year);
  const toast = useToast();
  if (!year) return <p role="status">Belum ada tahun anggaran.</p>;
  const isEq = kind === 'equipment';
  const columns: Column<InventoryItem>[] = [
    { key: 'nama', header: isEq ? 'Peralatan' : 'Barang', cell: (r) => r.name },
    {
      key: 'jumlah',
      header: 'Jumlah',
      align: 'right',
      cell: (r) => `${num(r.quantity)} ${r.unit}`,
    },
    ...(isEq
      ? [
          {
            key: 'dukungan',
            header: 'Dukungan',
            cell: (r: InventoryItem) =>
              SUPPORT_KEYS.filter((k) => r[k])
                .map((k) => SUPPORT_LABEL[k])
                .join(', ') || '-',
          },
        ]
      : []),
    { key: 'lokasi', header: 'Posisi', cell: (r) => r.locationText ?? '-' },
    { key: 'inst', header: 'Penanggung jawab', cell: (r) => r.institution ?? '-' },
    { key: 'baik', header: 'Baik', align: 'right', cell: (r) => num(r.qtyGood) },
    { key: 'rusak', header: 'Rusak', align: 'right', cell: (r) => num(r.qtyBroken) },
  ];
  if (!locked) {
    columns.push({
      key: 'aksi',
      header: 'Aksi',
      cell: (r) => (
        <button
          type="button"
          className="text-sm text-red-800 underline"
          onClick={() =>
            remove.mutate(r.id, {
              onError: (e) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat'),
            })
          }
        >
          Hapus
        </button>
      ),
    });
  }
  const code = isEq ? '5.A.7' : '5.A.8';
  return (
    <section aria-labelledby="judul-inventaris" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 id="judul-inventaris" className="text-2xl font-bold tracking-tight text-slate-900">
          {isEq ? 'Peralatan operasi tanggap darurat' : 'Stok logistik pengungsian'} · {year}
        </h1>
        <div className="ml-auto flex gap-2">
          <ExportButton year={year} formCode={code} format="xlsx" label={`Form ${code}`} />
          <ExportButton year={year} formCode={code} format="pdf" label={`Form ${code}`} />
        </div>
      </div>
      {!locked && <InventoryForm kind={kind} year={year} />}
      <DataTable
        caption={isEq ? 'Daftar peralatan' : 'Daftar stok logistik'}
        loading={isLoading}
        rows={data}
        rowKey={(r) => r.id}
        columns={columns}
      />
    </section>
  );
}
