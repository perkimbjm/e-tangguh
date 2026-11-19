import { useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYearMutations } from './api';

export function RevisionDialog({
  year,
  open,
  onClose,
}: {
  year: number;
  open: boolean;
  onClose(): void;
}) {
  const { revise } = useFiscalYearMutations();
  const toast = useToast();
  const [reason, setReason] = useState('');
  return (
    <ConfirmDialog
      open={open}
      title={`Buka revisi tahun anggaran ${year}?`}
      confirmLabel="Buka revisi"
      onCancel={onClose}
      onConfirm={() =>
        revise.mutate(
          { year, reason },
          {
            onSuccess: (r) => {
              toast(`Revisi ${r.revisionNo} dibuka; data dapat diubah kembali`, 'info');
              setReason('');
              onClose();
            },
            onError: (e) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat'),
          },
        )
      }
    >
      <p>
        Arsip finalisasi sebelumnya tetap tersimpan. Alasan revisi dicatat pada arsip berikutnya dan
        jejak audit.
      </p>
      <label className="mt-3 block">
        Alasan revisi (minimal 10 karakter)
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5"
        />
      </label>
    </ConfirmDialog>
  );
}
