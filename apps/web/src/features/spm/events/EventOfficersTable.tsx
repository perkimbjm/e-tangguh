import { POSITION_LABEL, type OfficerPosition } from '@etangguh/shared';
import { useState } from 'react';
import { DataTable } from '../../../components/DataTable';
import { useToast } from '../../../components/Toast';
import { ApiError } from '../../../lib/api-client';
import { useOfficers } from '../officers/api';
import { useEventMutations, useEventOfficers } from './api';

export function EventOfficersTable({
  year,
  eventId,
  locked,
}: {
  year: number;
  eventId: string;
  locked: boolean;
}) {
  const { data = [], isLoading } = useEventOfficers(year, eventId);
  const { data: officers = [] } = useOfficers(year);
  const m = useEventMutations(year, eventId);
  const toast = useToast();
  const [pick, setPick] = useState('');
  const available = officers.filter((o) => !data.some((d) => d.officerId === o.id));
  const fail = (e: unknown) => toast(e instanceof ApiError ? e.message : 'Gagal', 'galat');

  return (
    <section aria-labelledby="judul-petugas-aktif" className="space-y-3">
      <h2 id="judul-petugas-aktif" className="text-lg font-semibold">
        Petugas aktif
      </h2>
      {!locked && (
        <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-3 text-sm">
          <label>
            Petugas (tercatat tahun ini)
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="mt-1 block min-w-[240px] rounded-md border border-slate-300 px-2 py-1.5"
            >
              <option value="">Pilih</option>
              {available.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.fullName} · {POSITION_LABEL[o.position]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!pick || m.putOfficer.isPending}
            onClick={() => {
              const o = officers.find((x) => x.id === pick)!;
              m.putOfficer.mutate(
                {
                  officerId: pick,
                  isTrcKlb: o.isTrcKlb,
                  isTrcPdb: o.isTrcPdb,
                  isPpe: o.isPpe,
                  isOps: o.isOps,
                },
                { onSuccess: () => setPick(''), onError: fail },
              );
            }}
            className="rounded-md bg-sungai-800 px-3 py-2 font-semibold text-white disabled:opacity-50"
          >
            Tambahkan
          </button>
        </div>
      )}
      <DataTable
        caption="Petugas aktif pada kejadian ini"
        loading={isLoading}
        rows={data}
        rowKey={(r) => r.officerId}
        columns={[
          { key: 'nama', header: 'Nama', cell: (r) => r.fullName },
          {
            key: 'jabatan',
            header: 'Jabatan',
            cell: (r) => POSITION_LABEL[r.position as OfficerPosition] ?? r.position,
          },
          {
            key: 'tugas',
            header: 'Penugasan',
            cell: (r) =>
              [
                r.isTrcPdb && 'TRC PDB',
                r.isTrcKlb && 'TRC KLB',
                r.isPpe && 'PPE',
                r.isOps && 'Operasi',
              ]
                .filter(Boolean)
                .join(', ') || '-',
          },
          {
            key: 'pos',
            header: 'Lokasi',
            cell: (r) =>
              r.postType === 'posko'
                ? 'Posko'
                : r.postType === 'pos_lapangan'
                  ? 'Pos lapangan'
                  : '-',
          },
          ...(locked
            ? []
            : [
                {
                  key: 'aksi',
                  header: 'Aksi',
                  cell: (r: (typeof data)[number]) => (
                    <button
                      type="button"
                      onClick={() => m.removeOfficer.mutate(r.officerId, { onError: fail })}
                      className="text-sm text-red-800 underline"
                    >
                      Lepas
                    </button>
                  ),
                },
              ]),
        ]}
      />
    </section>
  );
}
