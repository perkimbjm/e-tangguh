# Quickstart: Validasi Data Dasar SPM (Form 5.A)

Melanjutkan `specs/001-basis-data-relawan/quickstart.md` (prasyarat, `pnpm install`, basis data,
migrasi). Perintah di bawah adalah target yang WAJIB disediakan implementasi.

## Menyiapkan data sintetis

```bash
pnpm db:seed:spm
```

Membuat tahun anggaran 2026 berstatus terbuka, kawasan rawan pada tiga kelurahan, akun
`pendata_kelurahan`, `operator_bpbd`, `admin_bpbd`, dan definisi Form 5.A.

```bash
pnpm spm:gen-fixture --rows 1000 --errors 50 --out tmp/kelurahan-uji.xlsx
```

Menghasilkan lembar kerja Form 5.A.1 sintetis dengan 50 baris sengaja salah. Data nyata
DILARANG dipakai.

## Menguji

```bash
pnpm test --filter spm
```

```bash
pnpm test:integration --filter spm
```

```bash
pnpm test:e2e --grep spm
```

```bash
pnpm spm:load-test --residents 200000
```

## Skenario validasi

| # | Skenario | Hasil yang diharapkan | Rujukan |
|---|---|---|---|
| 1 | Sebagai pendata, unduh templat 5.A.1, unggah `kelurahan-uji.xlsx` | pratinjau: 950 baru, 50 ditolak; tiap galat memuat baris, kolom, kode | US1, FR-006, FR-007, SC-002 |
| 2 | Konfirmasi impor | 950 baris berstatus `menunggu`; rekap belum berubah | FR-028 |
| 3 | Sebagai operator, setujui seluruh berkas dengan satu tindakan | 950 baris `disetujui`; rekap berubah | FR-028 |
| 4 | Unggah ulang berkas yang sama | 0 baru, 0 berubah | `contracts/import.md` |
| 5 | Unggah baris ber-RT/RW di luar kawasan rawan | ditolak `DI_LUAR_KAWASAN_RAWAN` | FR-027 |
| 6 | Sebagai pendata, minta data kelurahan lain | 403 | FR-022 |
| 7 | Buka Form 5.A.3, klik satu angka | daftar penyusun berjumlah sama dengan angkanya | US2, FR-016, SC-003 |
| 8 | Ubah `hazard_mask` satu warga, buka ulang 5.A.3 | angka variasi berpindah sesuai | FR-015 |
| 9 | Ekspor 5.A.1 ke XLSX dan PDF | kepala dan penomoran kolom sama dengan templat resmi | FR-017, SC-005 |
| 10 | Tambah petugas dari relawan terverifikasi | data diri dan sertifikasi terisi; muncul di 5.A.5, terhitung di 5.A.4 dan 5.A.6 | US3, FR-010 |
| 11 | Catat kejadian dengan penetapan darurat 10 jam setelah laporan | kolom "< 24 jam" tercentang pada 5.A.12 | FR-011 |
| 12 | Tambah tiga warga terdampak, ubah status satu korban | riwayat status tersimpan; 5.A.9 dan 5.A.10 sesuai | US4, FR-012 |
| 13 | Catat warga tanpa NIK | tersimpan dengan penanda; terhitung di rekap; tampil di ringkasan kelengkapan | FR-001, SC-004 |
| 14 | Finalkan tahun saat masih ada baris `menunggu` | ditolak | Edge Cases |
| 15 | Finalkan, coba ubah data | 423; arsip ZIP tersedia | US6, FR-020 |
| 16 | Buka revisi dengan alasan, ubah satu baris, finalkan lagi | revisi 1 tercatat; arsip revisi 0 masih dapat diunduh | FR-020 |
| 17 | Buka tahun 2027 dengan salin maju | warga, kawasan, petugas, inventaris tersalin; kejadian tidak; kelompok umur dihitung ulang | FR-021 |
| 18 | Jalankan uji beban 200.000 warga | rekap seluruh kota ≤ 5 detik | SC-006 |
| 19 | Periksa respons daftar warga | NIK/KK tersamar; pembukaan rincian tercatat audit | FR-023, FR-024, SC-008 |

Skenario 1-17 dan 19 WAJIB tercakup uji otomatis; skenario 18 dijalankan sebelum rilis dan
hasilnya dicatat.
