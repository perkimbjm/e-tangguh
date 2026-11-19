import type { RecapTable as Table } from '@etangguh/shared';

interface Props {
  table: Table;
  onCell(cellKey: string, label: string): void;
}

/** Tabel rekap: setiap angka dapat diklik untuk melihat baris penyusunnya. */
export function RecapTable({ table, onCell }: Props) {
  const byHazard = table.formCode === '5.A.6';
  const groups: { label: string; span: number }[] = [];
  for (const c of table.columns) {
    const g = c.group ?? c.label;
    const last = groups[groups.length - 1];
    if (last && last.label === g && c.group) last.span++;
    else groups.push({ label: g, span: 1 });
  }
  const labelCols = byHazard ? ['No.', 'Jenis bencana'] : ['No.', 'Kecamatan', 'Desa/kelurahan'];
  let no = 0;

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full border-collapse text-sm">
        <caption className="sr-only">Rekapitulasi Form {table.formCode} tahun anggaran {table.year}</caption>
        <thead className="bg-slate-50 text-xs">
          <tr>
            {labelCols.map((l) => (
              <th key={l} rowSpan={2} scope="col" className="border border-slate-200 px-2 py-1 text-left">
                {l}
              </th>
            ))}
            {groups.map((g, i) => (
              <th key={i} colSpan={g.span} scope="colgroup" className="border border-slate-200 px-2 py-1">
                {g.label}
              </th>
            ))}
          </tr>
          <tr>
            {table.columns.map((c) => (
              <th key={c.key} scope="col" className="border border-slate-200 px-2 py-1 font-medium">
                {c.group ? c.label : ''} <span className="block text-[10px] text-slate-500">({c.number})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((r) => {
            const strong = r.kind !== 'data';
            if (r.kind === 'data') no++;
            return (
              <tr key={r.key} className={strong ? 'bg-sky-50 font-semibold' : 'hover:bg-slate-50'}>
                <td className="border border-slate-200 px-2 py-1 tabular-nums">{r.kind === 'data' ? no : ''}</td>
                {byHazard ? (
                  <th scope="row" className="border border-slate-200 px-2 py-1 text-left font-medium">
                    {r.label}
                  </th>
                ) : (
                  <>
                    <td className="border border-slate-200 px-2 py-1">{r.kind === 'total' ? 'Jumlah kota' : r.group}</td>
                    <th scope="row" className="border border-slate-200 px-2 py-1 text-left font-medium">
                      {r.kind === 'data' ? r.label : r.kind === 'subtotal' ? 'Jumlah' : ''}
                    </th>
                  </>
                )}
                {table.columns.map((c) => {
                  const cell = r.cells[c.key];
                  if (!cell || !('cellKey' in cell)) return <td key={c.key} className="border border-slate-200 px-2 py-1 text-xs">{cell && 'text' in cell ? cell.text : ''}</td>;
                  return (
                    <td key={c.key} className="border border-slate-200 px-1 py-0.5 text-right tabular-nums">
                      {cell.value > 0 ? (
                        <button
                          type="button"
                          onClick={() => onCell(cell.cellKey, `${r.label} · kolom ${c.number}`)}
                          className="w-full rounded px-1 py-0.5 text-right text-sky-800 underline decoration-dotted underline-offset-2 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-700"
                          aria-label={`${cell.value}, lihat penyusun ${r.label} kolom ${c.number}`}
                        >
                          {cell.value}
                        </button>
                      ) : (
                        <span className="px-1 text-slate-500" title={cell.pending}>
                          {cell.value}
                          {cell.pending ? '*' : ''}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
