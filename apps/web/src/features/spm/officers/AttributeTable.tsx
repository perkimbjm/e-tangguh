import { ATTRIBUTE_CODES, ATTRIBUTE_LABEL, type OfficerCardDto } from '@etangguh/shared';
import { SERIES } from '../../../components/charts/palette';

/** Tabel nilai atribut yang menyertai setiap diagram radar (dibaca pembaca layar). */
export function AttributeTable({ cards }: { cards: OfficerCardDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <caption className="sr-only">Nilai atribut kompetensi dan kesiapan</caption>
        <thead className="text-left text-xs text-slate-500">
          <tr>
            <th scope="col" className="border-b border-slate-200 px-2 py-2 font-medium">
              Atribut
            </th>
            {cards.map((c, i) => (
              <th
                key={c.id}
                scope="col"
                className="border-b border-slate-200 px-2 py-2 text-right font-medium"
              >
                {cards.length > 1 && (
                  <span
                    aria-hidden
                    className="mr-1.5 inline-block h-2 w-3 rounded-sm align-middle"
                    style={{ backgroundColor: SERIES[i] }}
                  />
                )}
                {c.fullName}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTE_CODES.map((k) => (
            <tr key={k} className="border-b border-slate-100">
              <th scope="row" className="px-2 py-2 text-left font-medium text-slate-800">
                <span className="mr-2 inline-block w-9 font-bold text-sungai-800">
                  {ATTRIBUTE_LABEL[k].code}
                </span>
                {ATTRIBUTE_LABEL[k].name}
                <span className="block text-xs font-normal text-slate-500">
                  {ATTRIBUTE_LABEL[k].source}
                </span>
              </th>
              {cards.map((c) => (
                <td key={c.id} className="px-2 py-2 text-right font-semibold tabular-nums">
                  {c.noData.includes(k) ? (
                    <span className="text-xs font-normal text-slate-500">belum ada data (1)</span>
                  ) : (
                    c.attributes.values[k]
                  )}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="px-2 py-2 text-left font-bold">
              Keseluruhan
            </th>
            {cards.map((c) => (
              <td key={c.id} className="px-2 py-2 text-right text-lg font-black tabular-nums">
                {c.attributes.overall}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
