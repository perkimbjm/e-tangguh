# Contract: Pemetaan Formulir 5.A ke Data

Kontrak ini mengikat isi tiap formulir ekspor. Susunan kolom mengikuti berkas kerja SPM BPBD TA
2026 (merujuk Permendagri No. 101 Tahun 2018) dan disimpan sebagai berkas definisi formulir berversi di `packages/shared/src/spm/forms/`. Kepala
laporan tiap formulir: judul formulir, PROVINSI, KABUPATEN/KOTA, TAHUN ANGGARAN, lalu baris
penomoran kolom. Hanya baris `disetujui` dan `is_active` yang masuk.

## Formulir rincian (dari data yang diisi)

| Form | Isi | Satu baris = | Sumber utama | Urutan |
|---|---|---|---|---|
| 5.A.1 | Daftar warga di kawasan rawan bencana | satu warga; kepala keluarga pada kolom 2, anggota pada kolom 3 | `resident_records` + `persons` + `families` | kecamatan, kelurahan, KK, kepala keluarga dulu |
| 5.A.2 | Kerawanan tempat tinggal | satu warga | `resident_records.hazard_mask`; kolom peran dari `officer_records` | sama dengan 5.A.1 |
| 5.A.5 | Petugas operasi | satu petugas | `officer_records` + `persons` | nama |
| 5.A.7 | Peralatan | satu peralatan | `equipment` | nama |
| 5.A.8 | Stok logistik pengungsian | satu barang | `logistics_stock` | nama |
| 5.A.9 | Daftar warga negara yang menjadi korban bencana (per kejadian) | satu korban | `affected_persons` + `persons` | per kejadian |
| 5.A.10 | Status korban per kejadian | satu warga terdampak | `affected_persons.status` | per kejadian |
| 5.A.11 | Petugas aktif per kejadian | satu petugas | `event_officers` | per kejadian |
| 5.A.12 | Kejadian bencana | satu kejadian | `disaster_events` | waktu kejadian |

Kolom centang diisi tanda centang, bukan teks. Kolom turunan yang tidak diketik pendata:

| Form/kolom | Dihitung dari |
|---|---|
| 5.A.1 kol. 15 kelompok umur rentan | `age_group ≠ dewasa` |
| 5.A.2 kol. 9-18 jenis kerawanan | bit pada `hazard_mask` |
| 5.A.2 nomor variasi kelompok kerawanan | peringkat `hazard_mask` berbeda dalam tahun itu |
| 5.A.2 kol. 20-22 peran | warga = punya `resident_records`; aparatur = `employment_status ≠ non_aparatur`; petugas operasi = `is_ops` |
| 5.A.10 kol. 13-18 peran | sama seperti di atas, ditambah `is_trc_klb`, `is_trc_pdb`, `is_ppe` |
| 5.A.12 kol. 7-9 status darurat | selisih `emergency_declared_at` dan `reported_at` |

## Judul yang tidak tertulis pada lembar kerja

Lembar Form 5.A.9 pada templat tidak memuat baris judul. Judul resmi menurut BPBD: "DAFTAR
WARGA NEGARA YANG MENJADI KORBAN BENCANA". Ekspor menuliskan judul ini.

## Formulir rekapitulasi (seluruhnya dihitung)

### 5.A.3 Rekapitulasi kelompok warga menurut kelompok kerawanan

Baris = kelurahan (dikelompokkan per kecamatan, dengan baris jumlah per kecamatan). Untuk tiap
variasi kerawanan yang ada di kota pada tahun itu: kelompok jenis bencana (nama jenis pada
bitmask), jumlah KK (`count distinct family_id`), jumlah jiwa (`count`). Jumlah kolom variasi
mengikuti data, tidak dibatasi dua kolom contoh. Total KK dan jiwa = penjumlahan seluruh variasi.

### 5.A.4 Rekapitulasi aparatur dan warga di kawasan rawan

Baris = kelurahan.

| Kolom | Rumus |
|---|---|
| 4-8 PNS, TNI, POLRI, Satlinmas, tenaga kontrak | jumlah `officer_records` per `employment_status` menurut `duty_kelurahan_id` (kelurahan wilayah tugas): Kasi Trantibumlinmas → PNS, Babinsa → TNI, Bhabinkamtibmas → POLRI, Linmas → Satlinmas |
| 14 keterangan | "Relawan: n orang" = jumlah `officer_records` berjabatan `relawan` di kelurahan itu (formulir tidak memiliki kolom relawan; tafsir penyusun) |
| 9 jiwa | jumlah warga |
| 10 KK | `count distinct family_id` |
| 11 KK miskin | `count distinct family_id` yang kepala keluarganya `is_poor` |
| 12 berkebutuhan khusus | jumlah `has_special_needs` |
| 13 kelompok rentan | jumlah `age_group ≠ dewasa` |

### 5.A.6 Rekapitulasi warga dan petugas per jenis bencana

Baris = sepuluh jenis bencana.

| Kolom | Rumus |
|---|---|
| 3 jiwa | warga dengan bit jenis itu pada `hazard_mask` |
| 4 KK | `count distinct family_id` dari warga tersebut |
| 5 desa/kelurahan | `count distinct kelurahan_id` dari `hazard_zones` dengan bit jenis itu |
| 6 TRC PDB, 7 TRC KLB, 8 PPE, 9 operasi | petugas dengan penanda terkait dan bit jenis itu pada `officer_records.hazard_mask` |
| 10 jumlah petugas | petugas unik pada kolom 6-9 |
| 11 total wajib latih | sesuai rumus pada kepala kolom formulir (kolom 4 + kolom 10) |

Catatan: keterangan pada berkas kerja menulis penomoran kolom yang bergeser satu dari kepala
tabel. Implementasi mengikuti rumus yang tertulis pada kepala kolom formulir, dan hal ini
dicatat untuk dikonfirmasi BPBD.

## Jaminan kontrak (diuji otomatis)

- Setiap sel rekap memiliki definisi tunggal yang dipakai untuk angka dan untuk penelusuran;
  jumlah baris hasil penelusuran selalu sama dengan angka selnya.
- Struktur kepala (judul, sel gabung, penomoran kolom) tiap ekspor XLSX sama dengan rujukan di
  `specs/002-spm-data-dasar/reference/form-headers/` ("berkas emas"), yang diekstrak dari
  templat kosong BPBD TA 2026.
- XLSX dan PDF satu formulir dihasilkan dari definisi yang sama dan memuat nilai yang sama.
- Orang tanpa NIK tampil dengan kolom NIK kosong dan tetap terhitung.
