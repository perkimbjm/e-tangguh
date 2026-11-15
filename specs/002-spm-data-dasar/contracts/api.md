# Contract: REST API `/api/v1/spm`

Melanjutkan konvensi `specs/001-basis-data-relawan/contracts/api.md` (cookie sesi, CSRF, bentuk
galat, default ditolak). Semua jalur menerima `:fy` = tahun anggaran. Tulis pada tahun `final`
mengembalikan 423.

Peran: K = pendata_kelurahan (hanya kelurahannya), O = operator_bpbd, A = admin_bpbd,
S = super_admin. Kolom "Audit" = tercatat di `audit_log`.

## Tahun anggaran

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /fiscal-years | K O A S | | daftar dan status |
| POST | /fiscal-years | A S | ya | buka tahun; `copy_from` opsional (salin maju) |
| PATCH | /fiscal-years/:fy/settings | A S | ya | batas kelompok umur, tanggal acuan |
| POST | /fiscal-years/:fy/finalize | A S | ya | ditolak bila ada baris `menunggu`; membuat arsip |
| POST | /fiscal-years/:fy/revisions | A S | ya | `reason` wajib; status → `revisi` |
| GET | /fiscal-years/:fy/snapshots | O A S | | daftar arsip per revisi |
| GET | /fiscal-years/:fy/snapshots/:rev/archive | O A S | ya | unduh ZIP arsip |

## Kawasan rawan

| Metode | Jalur | Peran | Audit |
|---|---|---|---|
| GET | /:fy/hazard-zones?kelurahan= | K O A S | |
| POST/PATCH/DELETE | /:fy/hazard-zones[/:id] | A S | ya |

## Warga

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /:fy/residents | K O A S | | filter kelurahan, RT/RW, status persetujuan, nama, `nik` (cocok persis); NIK/KK tersamar; paginasi kursor |
| GET | /:fy/residents/:id | K O A S | ya | rincian dengan NIK/KK utuh |
| POST | /:fy/residents | K O A S | ya | mencari `persons` lewat NIK sebelum membuat baru |
| PATCH | /:fy/residents/:id | K O A S | ya | wajib `row_version`; 409 bila usang |
| POST | /:fy/residents/:id/deactivate | K O A S | ya | alasan dan tanggal |
| POST | /:fy/residents/approve | O A S | ya | menurut `batch_id` atau `kelurahan_id`, atau daftar id |
| POST | /:fy/residents/return | O A S | ya | `note` wajib |
| GET | /:fy/completeness | K O A S | | per kelurahan: jumlah, menunggu, belum lengkap, tanpa NIK |
| POST | /persons/:id/merge | A S | ya | gabung catatan ganda |
| GET/POST | /:fy/corrections | O A S | ya (POST) | permintaan pembetulan dari warga |

## Impor dan templat

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /templates/:formCode | K O A S | | templat kosong ber-validasi |
| POST | /:fy/imports | K O A S | ya | multipart; mengembalikan pratinjau |
| GET | /:fy/imports/:id | pengunggah, O A S | | ringkasan dan galat |
| GET | /:fy/imports/:id/errors.xlsx | pengunggah, O A S | ya | dibuat saat diminta, tidak disimpan; hanya tersedia sebelum konfirmasi/pembatalan |
| POST | /:fy/imports/:id/region-mapping | pengunggah, O A S | | memilih padanan wilayah |
| POST | /:fy/imports/:id/confirm | pengunggah, O A S | ya | |
| POST | /:fy/imports/:id/cancel | pengunggah, O A S | ya | |

## Petugas, kejadian, inventaris

| Metode | Jalur | Peran | Audit |
|---|---|---|---|
| GET/POST | /:fy/officers | O A S | ya (POST) |
| POST | /:fy/officers/from-volunteer/:volunteerId | O A S | ya |
| PATCH/DELETE | /:fy/officers/:id | O A S | ya |
| GET/POST | /:fy/events | O A S | ya (POST) |
| PATCH | /:fy/events/:id | O A S | ya |
| GET/POST | /:fy/events/:id/affected | O A S | ya (POST) |
| PATCH | /:fy/events/:id/affected/:personId | O A S | ya |
| GET/PUT/DELETE | /:fy/events/:id/officers[/:officerId] | O A S | ya (ubah) |
| GET/POST/PATCH/DELETE | /:fy/equipment[/:id] | O A S | ya (ubah) |
| GET/POST/PATCH/DELETE | /:fy/logistics[/:id] | O A S | ya (ubah) |

## Rekapitulasi dan ekspor

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /:fy/recap/:formCode | K (kelurahannya) O A S | | `5.A.3`, `5.A.4`, `5.A.6`; tiap sel membawa `cell_key` |
| GET | /:fy/recap/:formCode/cells/:cellKey/rows | K (kelurahannya) O A S | ya | baris penyusun; jumlah = nilai sel |
| GET | /:fy/forms/:formCode/export?format=xlsx\|pdf&kelurahan=&event= | O A S | ya | pendata kelurahan tidak dapat mengekspor (403) |
| GET | /:fy/forms/export-all | O A S | ya | ZIP seluruh Form 5.A |

## Masa simpan

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /fiscal-years/:fy/retention | A S | | tanggal jatuh tempo anonimisasi |
| POST | /fiscal-years/:fy/anonymize | S | ya | hanya setelah masa simpan terlewati; juga dijalankan tugas terjadwal |

## Jaminan kontrak (diuji otomatis)

- Matriks izin: setiap jalur diuji untuk setiap peran, termasuk pendata yang mencoba kelurahan
  lain (403) dan tulis pada tahun final (423).
- Tidak ada respons daftar yang memuat NIK atau nomor KK utuh.
- Setiap baris bertanda "Audit: ya" menghasilkan tepat satu entri audit per permintaan berhasil.
- `rows` dari sebuah `cell_key` berjumlah sama dengan nilai sel pada permintaan yang sama.
