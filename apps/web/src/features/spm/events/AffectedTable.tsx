import { AFFECTED_LABEL, AFFECTED_STATUSES, type AffectedStatus } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { DataTable } from '../../../components/DataTable';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { isoToWita, useAffected, useEventMutations } from './api';

export function AffectedTable({
  year,
  eventId,
  locked,
}: {
  year: number;
  eventId: string;
  locked: boolean;
}) {
  const { data = [], isLoading } = useAffected(year, eventId);
  const m = useEventMutations(year, eventId);
  const toast = useToast();
  const [noNik, setNoNik] = useState(false);
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat');

  function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const s = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    m.addAffected.mutate(
      {
        fullName: s('fullName'),
        gender: s('gender') as 'L' | 'P',
        nik: noNik ? undefined : s('nik'),
        noNikReason: noNik ? s('noNikReason') : undefined,
        status: s('status') as AffectedStatus,
        isDisplaced: f.get('isDisplaced') === 'on',
      },
      {
        onSuccess: (r) => {
          toast(
            (r as { personCreated: boolean }).personCreated
              ? 'Korban baru dicatat'
              : 'Korban dicatat; data diri dari catatan yang sudah ada',
            'sukses',
          );
          form.reset();
        },
        onError: fail,
      },
    );
  }

  return (
    <section aria-labelledby="judul-terdampak" className="space-y-3">
      <h2 id="judul-terdampak" className="text-lg font-semibold">
        Warga terdampak
      </h2>
      {!locked && (
        <form
          onSubmit={add}
          className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-3 text-sm"
        >
          <label>
            Nama
            <input
              name="fullName"
              required
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5"
            />
          </label>
          <label>
            L/P
            <select
              name="gender"
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5"
            >
              <option value="L">L</option>
              <option value="P">P</option>
            </select>
          </label>
          {noNik ? (
            <label>
              Alasan tanpa NIK
              <input
                name="noNikReason"
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5"
              />
            </label>
          ) : (
            <label>
              NIK
              <input
                name="nik"
                inputMode="numeric"
                autoComplete="off"
                className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5"
              />
            </label>
          )}
          <label className="flex items-center gap-1 pb-2">
            <input type="checkbox" checked={noNik} onChange={(e) => setNoNik(e.target.checked)} />{' '}
            NIK belum ada
          </label>
          <label>
            Status
            <select
              name="status"
              className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5"
            >
              {AFFECTED_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {AFFECTED_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 pb-2">
            <input type="checkbox" name="isDisplaced" /> Mengungsi
          </label>
          <button
            type="submit"
            disabled={m.addAffected.isPending}
            className="rounded-md bg-sungai-800 px-3 py-2 font-semibold text-white"
          >
            Tambah
          </button>
        </form>
      )}
      <DataTable
        caption="Warga terdampak kejadian ini"
        loading={isLoading}
        rows={data}
        rowKey={(r) => r.personId}
        columns={[
          {
            key: 'nama',
            header: 'Nama',
            cell: (r) => (
              <>
                {r.fullName}
                {r.isResident && (
                  <span className="ml-1 text-xs text-slate-500">(warga kawasan rawan)</span>
                )}
              </>
            ),
          },
          {
            key: 'nik',
            header: 'NIK',
            cell: (r) => <span className="font-mono text-xs">{r.nikMasked ?? 'belum ada'}</span>,
          },
          {
            key: 'status',
            header: 'Status',
            cell: (r) =>
              locked ? (
                AFFECTED_LABEL[r.status]
              ) : (
                <select
                  aria-label={`Status ${r.fullName}`}
                  value={r.status}
                  onChange={(e) =>
                    m.updateAffected.mutate(
                      { personId: r.personId, status: e.target.value as AffectedStatus },
                      { onError: fail },
                    )
                  }
                  className="rounded-md border border-slate-300 px-2 py-1"
                >
                  {AFFECTED_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {AFFECTED_LABEL[s]}
                    </option>
                  ))}
                </select>
              ),
          },
          { key: 'ungsi', header: 'Mengungsi', cell: (r) => (r.isDisplaced ? 'Ya' : 'Tidak') },
          {
            key: 'riwayat',
            header: 'Riwayat status',
            cell: (r) => (
              <span className="text-xs">
                {r.history
                  .map((h) => `${AFFECTED_LABEL[h.status]} (${isoToWita(h.changedAt)})`)
                  .join(' → ')}
              </span>
            ),
          },
        ]}
      />
    </section>
  );
}
