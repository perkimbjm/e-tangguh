import { useState } from 'react';
import { useFiscalYear } from '../../../lib/fiscal-year';
import { ExportButton } from '../exports/ExportButton';
import { CellDrilldownDrawer } from './CellDrilldownDrawer';
import { RecapTable } from './RecapTable';
import { useRecap } from './api';

const FORMS = [
  { code: '5.A.3', label: '5.A.3 Kelompok kerawanan' },
  { code: '5.A.4', label: '5.A.4 Aparatur dan warga' },
  { code: '5.A.6', label: '5.A.6 Per jenis bencana' },
];

export function RecapPage() {
  const { year } = useFiscalYear();
  const [form, setForm] = useState('5.A.3');
  const [cell, setCell] = useState<{ key: string; label: string } | null>(null);
  const { data, isLoading, error } = useRecap(year, form);

  if (!year) return <p role="status">Belum ada tahun anggaran.</p>;
  return (
    <section aria-labelledby="judul-rekap" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="judul-rekap" className="text-xl font-semibold">
          Rekapitulasi · {year}
        </h1>
        <div role="tablist" aria-label="Pilih formulir" className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {FORMS.map((f) => (
            <button
              key={f.code}
              role="tab"
              type="button"
              aria-selected={form === f.code}
              onClick={() => setForm(f.code)}
              className={`rounded-md px-3 py-1.5 text-sm ${form === f.code ? 'bg-white font-semibold shadow' : 'text-slate-700'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <ExportButton year={year} formCode={form} format="xlsx" />
          <ExportButton year={year} formCode={form} format="pdf" />
        </div>
      </div>
      <p className="text-sm text-slate-700">Angka dihitung otomatis dari data rincian. Klik angka untuk melihat warga, KK, atau kelurahan penyusunnya.</p>
      {isLoading && <p role="status">Menghitung…</p>}
      {error && <p role="alert" className="text-red-700">{(error as Error).message}</p>}
      {data && (
        <>
          <RecapTable table={data} onCell={(key, label) => setCell({ key, label })} />
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-600">
            {data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
            {data.rows.some((r) => Object.values(r.cells).some((c) => 'pending' in c && c.pending)) && <li>Tanda * = sumber data belum tersedia.</li>}
          </ul>
        </>
      )}
      <CellDrilldownDrawer year={year} formCode={form} cellKey={cell?.key ?? null} label={cell?.label ?? ''} onClose={() => setCell(null)} />
    </section>
  );
}
