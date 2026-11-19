import type { ImportPreview } from '@etangguh/shared';

export function ImportErrorsTable({ errors, truncated }: { errors: ImportPreview['errors']; truncated: boolean }) {
  if (errors.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-red-200 bg-white">
      <table className="min-w-full text-sm">
        <caption className="px-3 py-2 text-left font-semibold text-red-900">Baris ditolak{truncated ? ' (500 pertama; unduh daftar lengkap)' : ''}</caption>
        <thead className="bg-red-50">
          <tr>
            <th scope="col" className="px-3 py-2 text-left">Baris</th>
            <th scope="col" className="px-3 py-2 text-left">Kolom</th>
            <th scope="col" className="px-3 py-2 text-left">Kode</th>
            <th scope="col" className="px-3 py-2 text-left">Pesan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-red-50">
          {errors.flatMap((r) =>
            r.errors.map((e, i) => (
              <tr key={`${r.rowNumber}-${i}`}>
                <td className="px-3 py-1.5 tabular-nums">{r.rowNumber}</td>
                <td className="px-3 py-1.5 tabular-nums">{e.column}</td>
                <td className="px-3 py-1.5 font-mono text-xs">{e.code}</td>
                <td className="px-3 py-1.5">{e.message}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}
