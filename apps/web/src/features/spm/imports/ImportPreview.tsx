import type { ImportPreview as Preview } from '@etangguh/shared';
import { errorsUrl } from './api';

const STAT = [
  { key: 'rowsNew', label: 'Baru', cls: 'text-emerald-800' },
  { key: 'rowsChanged', label: 'Berubah', cls: 'text-sky-800' },
  { key: 'rowsUnchanged', label: 'Sama', cls: 'text-slate-700' },
  { key: 'rowsRejected', label: 'Ditolak', cls: 'text-red-800' },
] as const;

export function ImportPreview({ preview, year }: { preview: Preview; year: number }) {
  return (
    <section
      aria-labelledby="judul-pratinjau"
      className="space-y-3 rounded-2xl border border-slate-200/80 bg-white shadow-sm p-4"
    >
      <h2 id="judul-pratinjau" className="font-semibold">
        Pratinjau Form {preview.formCode} · {preview.rowsTotal} baris · status {preview.status}
      </h2>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT.map((s) => (
          <div key={s.key} className="rounded-md bg-slate-50 p-3">
            <dt className="text-xs text-slate-600">{s.label}</dt>
            <dd className={`text-2xl font-bold tabular-nums ${s.cls}`}>{preview[s.key]}</dd>
          </div>
        ))}
      </dl>
      {preview.warnings.length > 0 && (
        <details className="rounded-md bg-amber-50 p-3 text-sm">
          <summary className="cursor-pointer font-medium text-amber-900">
            {preview.warnings.length} peringatan (tidak menolak baris)
          </summary>
          <ul className="mt-2 list-disc pl-5">
            {preview.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
      {preview.rowsRejected > 0 && (
        <a
          href={errorsUrl(year, preview.id)}
          className="inline-block text-sm text-sky-800 underline"
        >
          Unduh daftar baris ditolak (.xlsx)
        </a>
      )}
    </section>
  );
}
