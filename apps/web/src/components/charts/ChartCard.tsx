import { Table2, BarChart3 } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  /** Padanan tabel (Prinsip IV): informasi sama dengan diagram. */
  table: { headers: string[]; rows: (string | number)[][] };
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

/** Wadah diagram dengan judul dan tombol beralih ke tampilan tabel. */
export function ChartCard({ title, subtitle, table, children, className = '', action }: Props) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}
      aria-label={title}
    >
      <header className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
        <button
          type="button"
          onClick={() => setAsTable((v) => !v)}
          aria-pressed={asTable}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          {asTable ? (
            <BarChart3 aria-hidden className="h-4 w-4" />
          ) : (
            <Table2 aria-hidden className="h-4 w-4" />
          )}
          {asTable ? 'Diagram' : 'Tabel'}
        </button>
      </header>
      {asTable ? (
        <div className="max-h-80 overflow-auto">
          <table className="min-w-full text-sm">
            <caption className="sr-only">{title}</caption>
            <thead className="sticky top-0 bg-white text-left text-xs text-slate-500">
              <tr>
                {table.headers.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="border-b border-slate-200 px-2 py-1.5 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {r.map((c, j) => (
                    <td
                      key={j}
                      className={`px-2 py-1.5 ${typeof c === 'number' ? 'text-right tabular-nums' : ''}`}
                    >
                      {typeof c === 'number' ? c.toLocaleString('id-ID') : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
