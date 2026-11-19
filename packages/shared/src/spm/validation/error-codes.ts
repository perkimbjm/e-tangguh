/** Kode galat impor per baris (contracts/import.md). */
export const IMPORT_ERROR_CODES = {
  NIK_PANJANG: 'NIK harus 16 digit',
  NIK_GANDA_BERKAS: 'NIK muncul lebih dari sekali dalam berkas',
  NIK_KELURAHAN_LAIN: 'NIK sudah tercatat di kelurahan lain pada tahun anggaran yang sama',
  NIK_KOSONG_TANPA_ALASAN: 'NIK kosong dan alasan belum ada NIK tidak diisi',
  KK_PANJANG: 'Nomor KK harus 16 digit',
  NAMA_KOSONG: 'Nama tidak diisi',
  TANGGAL_TIDAK_SAH: 'Tanggal lahir tidak terbaca atau di masa depan',
  WILAYAH_TIDAK_DIKENAL: 'Kelurahan/kecamatan tidak dapat dipadankan dengan wilayah resmi',
  WILAYAH_BUKAN_HAK: 'Anda hanya dapat mengunggah data kelurahan Anda',
  DI_LUAR_KAWASAN_RAWAN: 'RT/RW belum ditetapkan sebagai kawasan rawan bencana',
  PILIHAN_TIDAK_SAH: 'Nilai di luar daftar pilihan',
  KEBUTUHAN_KHUSUS_KOSONG: 'Berkebutuhan khusus "ya" tetapi jenisnya tidak diisi',
  RT_RW_TIDAK_TERBACA: 'RT/RW tidak terbaca dari kolom RT/RW maupun alamat',
  WARGA_BELUM_TERCATAT: 'Warga belum tercatat pada Form 5.A.1 tahun anggaran ini',
} as const;

export type ImportErrorCode = keyof typeof IMPORT_ERROR_CODES;

export interface RowError {
  /** Nomor kolom formulir (baris penomoran). */
  column: number;
  code: ImportErrorCode;
  message: string;
}

export function rowError(column: number, code: ImportErrorCode, detail?: string): RowError {
  return { column, code, message: detail ? `${IMPORT_ERROR_CODES[code]}: ${detail}` : IMPORT_ERROR_CODES[code] };
}
