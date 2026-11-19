/** Zona waktu Kota Banjarmasin (WITA, UTC+8). */
export const REPORT_TZ = 'Asia/Makassar';

const parts = (d: Date) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: REPORT_TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  ) as Record<string, string>;

export function dateWita(d: Date): string {
  const p = parts(d);
  return `${p.day}/${p.month}/${p.year}`;
}

export function timeWita(d: Date): string {
  const p = parts(d);
  return `${p.hour}:${p.minute}`;
}

/** Jam laporan; tanggal ikut ditulis bila berbeda hari dengan kejadian. */
export function reportTimeWita(reported: Date, occurred: Date): string {
  return dateWita(reported) === dateWita(occurred) ? timeWita(reported) : `${timeWita(reported)} (${dateWita(reported)})`;
}
