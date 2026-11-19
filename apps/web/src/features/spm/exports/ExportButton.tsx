export const exportUrl = (year: number, formCode: string, format: 'xlsx' | 'pdf', kelurahan?: string, event?: string) =>
  `/api/v1/spm/${year}/forms/${formCode}/export?format=${format}${kelurahan ? `&kelurahan=${kelurahan}` : ''}${event ? `&event=${event}` : ''}`;

/** Tautan unduh; otorisasi dan audit ditegakkan server. */
export function ExportButton({ year, formCode, format, kelurahan, event, label }: { year: number; formCode: string; format: 'xlsx' | 'pdf'; kelurahan?: string; event?: string; label?: string }) {
  return (
    <a
      href={exportUrl(year, formCode, format, kelurahan, event)}
      className={`rounded-md px-3 py-2 text-sm font-semibold ${format === 'xlsx' ? 'bg-emerald-700 text-white hover:bg-emerald-800' : 'border border-slate-300 hover:bg-slate-50'}`}
      aria-label={`Unduh Form ${formCode} format ${format.toUpperCase()}`}
    >
      {label ? `${label} (${format.toUpperCase()})` : format.toUpperCase()}
    </a>
  );
}
