import { useEffect, useRef } from 'react';
import { useDrilldown } from './api';

interface Props {
  year: number;
  formCode: string;
  cellKey: string | null;
  label: string;
  onClose(): void;
}

/** Daftar penyusun satu angka rekap; jumlah baris selalu sama dengan angka sel. */
export function CellDrilldownDrawer({ year, formCode, cellKey, label, onClose }: Props) {
  const { data, isLoading, error } = useDrilldown(year, formCode, cellKey);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (cellKey) heading.current?.focus();
  }, [cellKey]);
  if (!cellKey) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-telusur"
      className="fixed inset-0 z-40 flex justify-end bg-slate-900/40"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <h2 id="judul-telusur" ref={heading} tabIndex={-1} className="text-lg font-semibold">
            Penyusun angka
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm"
          >
            Tutup
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Form {formCode} · {label}
        </p>
        <p className="mt-1 text-xs text-amber-800">Penelusuran tercatat di jejak audit.</p>
        {isLoading && <p role="status">Memuat…</p>}
        {error && (
          <p role="alert" className="text-red-700">
            {(error as Error).message}
          </p>
        )}
        {data && (
          <>
            <p className="mt-3 font-semibold">
              {data.value}{' '}
              {data.measure === 'families'
                ? 'KK'
                : data.measure === 'zoneKelurahan'
                  ? 'kelurahan'
                  : 'baris'}
              {data.measure === 'sum' ? ' (penjumlahan kolom/baris lain)' : ''}
            </p>
            {data.truncated && (
              <p className="text-sm text-amber-800">Menampilkan 2.000 baris pertama.</p>
            )}
            <ol className="mt-2 divide-y divide-slate-100 text-sm">
              {data.rows.map((r, i) => (
                <li key={`${r.key}-${i}`} className="py-1.5">
                  <span className="font-medium">{r.label}</span>
                  <span className="block text-xs text-slate-600">
                    {r.detail}
                    {r.component ? ` · ${r.component}` : ''}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}
