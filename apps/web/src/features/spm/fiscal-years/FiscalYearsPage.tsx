import { ADMIN_ROLES, type FiscalYearDto } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useFiscalYears } from '../../../lib/fiscal-year';
import { useSession } from '../../../lib/session';
import { FinalizeDialog } from './FinalizeDialog';
import { RevisionDialog } from './RevisionDialog';
import { SnapshotsTable } from './SnapshotsTable';
import { useFiscalYearMutations } from './api';

const STATUS: Record<FiscalYearDto['status'], string> = {
  terbuka: 'Terbuka',
  final: 'Final (terkunci)',
  revisi: 'Revisi',
};

export function FiscalYearsPage() {
  const { data = [] } = useFiscalYears();
  const { user } = useSession();
  const isAdmin = !!user && (ADMIN_ROLES as readonly string[]).includes(user.role);
  const { create } = useFiscalYearMutations();
  const toast = useToast();
  const [dialog, setDialog] = useState<{ kind: 'final' | 'revisi'; fy: FiscalYearDto } | null>(
    null,
  );

  async function openYear(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const year = Number(f.get('year'));
    const from = String(f.get('copyFrom') ?? '');
    try {
      const r = await create.mutateAsync({ year, ...(from ? { copyFrom: Number(from) } : {}) });
      const c = r.copied;
      toast(
        c
          ? `Tahun ${year} dibuka: ${c.residents} warga, ${c.hazardZones} kawasan, ${c.officers} petugas, ${c.equipment + c.logistics} inventaris disalin`
          : `Tahun ${year} dibuka`,
        'sukses',
      );
      form.reset();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Gagal', 'galat');
    }
  }

  return (
    <section aria-labelledby="judul-ta" className="space-y-6">
      <h1 id="judul-ta" className="text-2xl font-bold tracking-tight text-slate-900">
        Tahun anggaran, finalisasi, dan revisi
      </h1>
      {isAdmin && (
        <form
          onSubmit={openYear}
          className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4 text-sm"
        >
          <label>
            Tahun baru
            <input
              name="year"
              type="number"
              min={2000}
              max={2100}
              required
              className="mt-1 block w-28 rounded-md border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label>
            Salin maju dari
            <select
              name="copyFrom"
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5"
            >
              <option value="">Tidak (kosong)</option>
              {data.map((y) => (
                <option key={y.id} value={y.year}>
                  {y.year}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-sungai-800 px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            Buka tahun anggaran
          </button>
          <p className="w-full text-xs text-slate-600">
            Salin maju menyalin kawasan rawan, warga aktif yang disetujui, petugas, dan inventaris.
            Kejadian tidak disalin; kelompok umur dihitung ulang.
          </p>
        </form>
      )}
      {data.map((fy) => (
        <article key={fy.id} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold">{fy.year}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">
              {STATUS[fy.status]}
              {fy.revisionNo > 0 ? ` · revisi ${fy.revisionNo}` : ''}
            </span>
            {fy.copiedFromYear && (
              <span className="text-xs text-slate-600">disalin dari {fy.copiedFromYear}</span>
            )}
            {isAdmin && fy.status !== 'final' && (
              <button
                type="button"
                onClick={() => setDialog({ kind: 'final', fy })}
                className="ml-auto rounded-md bg-red-700 px-3 py-1.5 text-sm font-semibold text-white"
              >
                Finalkan
              </button>
            )}
            {isAdmin && fy.status === 'final' && (
              <button
                type="button"
                onClick={() => setDialog({ kind: 'revisi', fy })}
                className="ml-auto rounded-md border border-slate-300 px-3 py-1.5 text-sm"
              >
                Buka revisi
              </button>
            )}
          </div>
          {fy.revisionReason && (
            <p className="text-sm text-slate-700">Alasan revisi berjalan: {fy.revisionReason}</p>
          )}
          <SnapshotsTable year={fy.year} />
        </article>
      ))}
      {dialog?.kind === 'final' && (
        <FinalizeDialog
          year={dialog.fy.year}
          revisionNo={dialog.fy.revisionNo}
          open
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'revisi' && (
        <RevisionDialog year={dialog.fy.year} open onClose={() => setDialog(null)} />
      )}
    </section>
  );
}
