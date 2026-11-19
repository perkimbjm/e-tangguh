import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYearMutations } from './api';

export function FinalizeDialog({
  year,
  revisionNo,
  open,
  onClose,
}: {
  year: number;
  revisionNo: number;
  open: boolean;
  onClose(): void;
}) {
  const { finalize } = useFiscalYearMutations();
  const toast = useToast();
  return (
    <ConfirmDialog
      open={open}
      title={`Finalkan tahun anggaran ${year}?`}
      confirmLabel={finalize.isPending ? 'Memproses…' : 'Finalkan'}
      danger
      onCancel={onClose}
      onConfirm={() =>
        finalize.mutate(year, {
          onSuccess: (r) => {
            toast(
              `Tahun ${year} final (revisi ${r.revisionNo}). Sidik arsip: ${r.sha256.slice(0, 16)}…`,
              'sukses',
            );
            onClose();
          },
          onError: (e) => toast(e instanceof ApiError ? e.message : 'Gagal memfinalkan', 'galat'),
        })
      }
    >
      <ul className="list-disc space-y-1 pl-5">
        <li>
          Seluruh Form 5.A diekspor dan disimpan sebagai arsip revisi {revisionNo} dengan sidik
          SHA-256.
        </li>
        <li>Seluruh data tahun ini terkunci. Koreksi sesudahnya harus melalui revisi bernomor.</li>
        <li>Ditolak bila masih ada data warga yang menunggu persetujuan.</li>
      </ul>
    </ConfirmDialog>
  );
}
