import { variationLabel } from '@etangguh/shared';
import { useEffect, useRef, useState } from 'react';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { AGE_LABEL, StatusBadge } from '../labels';
import { useDeactivateResident, useResidentDetail } from './api';

interface Props {
  year: number;
  id: string | null;
  locked: boolean;
  onClose(): void;
}

/** Rincian warga dengan NIK/KK utuh. Setiap pembukaan tercatat di jejak audit (server). */
export function ResidentDetailDrawer({ year, id, locked, onClose }: Props) {
  const { data, isLoading, error } = useResidentDetail(year, id);
  const deactivate = useDeactivateResident(year);
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (id) heading.current?.focus();
  }, [id]);

  if (!id) return null;
  const row = (label: string, value: React.ReactNode) => (
    <div className="grid grid-cols-[150px_1fr] gap-2 border-b border-slate-100 py-1.5 text-sm">
      <dt className="text-slate-600">{label}</dt>
      <dd>{value ?? '-'}</dd>
    </div>
  );

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="judul-rincian" className="fixed inset-0 z-40 flex justify-end bg-slate-900/40" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2 id="judul-rincian" ref={heading} tabIndex={-1} className="text-lg font-semibold">
            {data?.fullName ?? 'Rincian warga'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1 text-sm">
            Tutup
          </button>
        </div>
        <p className="mt-1 text-xs text-amber-800">Data pribadi. Pembukaan halaman ini tercatat di jejak audit.</p>
        {isLoading && <p role="status">Memuat…</p>}
        {error && <p role="alert" className="text-red-700">{(error as Error).message}</p>}
        {data && (
          <>
            <dl className="mt-4">
              {row('Status', data.isActive ? <StatusBadge status={data.approvalStatus} /> : `Nonaktif (${data.inactiveReason})`)}
              {data.approvalNote && row('Catatan BPBD', data.approvalNote)}
              {row('NIK', data.nik ? <span className="font-mono">{data.nik}</span> : `Belum ada — ${data.noNikReason}`)}
              {row('Nomor KK', data.kk && <span className="font-mono">{data.kk}</span>)}
              {row('Kepala keluarga', data.isFamilyHead ? 'Ya' : 'Tidak')}
              {row('Jenis kelamin', data.gender === 'L' ? 'Laki-laki' : 'Perempuan')}
              {row('Tempat, tanggal lahir', `${data.birthPlace ?? '-'}, ${data.birthDate ?? '-'}`)}
              {row('Kelompok umur', `${AGE_LABEL[data.ageGroup]}${data.ageGroupOverrideReason ? ` (dikoreksi: ${data.ageGroupOverrideReason})` : ''}`)}
              {row('Alamat', data.address)}
              {row('Kelurahan · RW/RT', `${data.kelurahanName} · ${data.rw}/${data.rt ?? '-'}`)}
              {row('Kondisi ekonomi', data.isPoor ? 'Miskin' : 'Tidak miskin')}
              {row('Kebutuhan khusus', data.hasSpecialNeeds ? data.specialNeeds : 'Tidak')}
              {row('Kerawanan', variationLabel(data.hazardMask))}
              {row('Sumber data', `${data.source ?? '-'} (${data.sourceDate ?? '-'})`)}
            </dl>
            {data.isActive && !locked && (
              <button type="button" onClick={() => setConfirm(true)} className="mt-5 rounded-md border border-red-300 px-3 py-2 text-sm text-red-800 hover:bg-red-50">
                Nonaktifkan (pindah/meninggal)
              </button>
            )}
            <ConfirmDialog
              open={confirm}
              title="Nonaktifkan warga?"
              danger
              confirmLabel="Nonaktifkan"
              onCancel={() => setConfirm(false)}
              onConfirm={() => {
                const form = document.getElementById('form-nonaktif') as HTMLFormElement | null;
                const fd = form ? new FormData(form) : null;
                deactivate.mutate(
                  { id: data.id, reason: String(fd?.get('reason') ?? 'pindah'), date: String(fd?.get('date') || new Date().toISOString().slice(0, 10)), rowVersion: data.rowVersion },
                  {
                    onSuccess: () => {
                      toast('Warga dinonaktifkan', 'sukses');
                      setConfirm(false);
                      onClose();
                    },
                    onError: (e) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat'),
                  },
                );
              }}
            >
              <form id="form-nonaktif" className="space-y-2">
                <label className="block">
                  Alasan
                  <select name="reason" className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5">
                    <option value="pindah">Pindah</option>
                    <option value="meninggal">Meninggal</option>
                    <option value="lainnya">Lainnya</option>
                  </select>
                </label>
                <label className="block">
                  Tanggal
                  <input type="date" name="date" className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5" />
                </label>
              </form>
            </ConfirmDialog>
          </>
        )}
      </div>
    </div>
  );
}
