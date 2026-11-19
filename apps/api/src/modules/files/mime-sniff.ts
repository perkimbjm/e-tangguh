/** Menentukan tipe berkas dari isi (tanda tangan bita), bukan dari nama atau header klien. */
export type SniffedMime =
  | 'application/pdf'
  | 'image/png'
  | 'image/jpeg'
  | 'image/webp'
  | 'application/zip'
  | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function sniffMime(buf: Buffer): SniffedMime | null {
  if (buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }
  if (buf.length >= 4 && buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) {
    // XLSX adalah ZIP yang memuat bagian `xl/`; cukup diperiksa pada 64 KiB pertama.
    return buf.subarray(0, 65_536).includes('xl/') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/zip';
  }
  return null;
}
