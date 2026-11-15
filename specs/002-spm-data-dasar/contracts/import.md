# Contract: Impor Lembar Kerja

## Berkas yang diterima

- Format `.xlsx`, maksimum 10 MB dan 20.000 baris data; satu lembar kerja per unggahan (pengguna
  memilih lembar bila berkas berisi lebih dari satu).
- Formulir: 5.A.1 (warga), 5.A.2 (kerawanan), 5.A.5 (petugas).
- Baris kepala ditemukan dari baris penomoran kolom; baris di atasnya (judul, provinsi, tahun)
  diabaikan kecuali tahun anggaran, yang harus sama dengan tahun tujuan bila tertulis.
- Kolom di luar formulir (misalnya kolom bantu berisi rumus) diabaikan, kecuali dua kolom
  tambahan opsional berkepala `LINTANG` dan `BUJUR` (derajat desimal, WGS 84) pada Form 5.A.1
  yang disimpan sebagai titik koordinat rumah.
- Susunan kolom yang tidak cocok dengan definisi formulir berversi menolak seluruh berkas dengan daftar
  kolom yang tidak dikenali.

## Alur

```text
unggah → validasi + pratinjau (import_batches: divalidasi)
       → konfirmasi (satu transaksi; baris menjadi resident_records/officer_records)
       → atau batal
```

Pratinjau memuat: jumlah baris baru, berubah, sama, ditolak; daftar galat yang dapat diunduh;
daftar padanan wilayah yang perlu dipilih. Konfirmasi hanya menyimpan baris yang tidak ditolak.
Baris dari pendata kelurahan berstatus `menunggu`; dari operator/admin BPBD `disetujui`.

## Normalisasi otomatis

| Kolom | Diterima | Disimpan |
|---|---|---|
| NIK, nomor KK | teks atau angka, spasi/tanda baca dibuang | 16 digit |
| Jenis kelamin | `L`, `P`, `laki-laki`, `perempuan` (tanpa beda huruf besar) | `L` / `P` |
| Tanggal lahir | tanggal Excel atau `dd/mm/yyyy` | `date` |
| Kondisi ekonomi | `miskin`, `tidak miskin` | boolean |
| Berkebutuhan khusus | `ya`, `tidak` | boolean |
| Kolom centang | `v`, `x`, `✓`, `1`, `ya` | boolean |
| Kelurahan, kecamatan | ejaan bebas | wilayah resmi lewat kemiripan trigram |
| Kepala/anggota keluarga | nama pada kolom 2 = kepala keluarga, kolom 3 = anggota | `is_family_head` |

Padanan wilayah: kemiripan ≥ 0,9 dipetakan otomatis; 0,5-0,9 ditawarkan untuk dipilih; di bawah
itu galat. Pilihan operator berlaku untuk seluruh baris dengan ejaan yang sama.

## Kode galat per baris

| Kode | Arti |
|---|---|
| `NIK_PANJANG` | NIK bukan 16 digit |
| `NIK_GANDA_BERKAS` | NIK muncul lebih dari sekali dalam berkas |
| `NIK_KELURAHAN_LAIN` | NIK sudah tercatat di kelurahan lain pada tahun yang sama |
| `NIK_KOSONG_TANPA_ALASAN` | NIK kosong dan alasan tidak diisi |
| `KK_PANJANG` | nomor KK bukan 16 digit |
| `NAMA_KOSONG` | nama tidak diisi |
| `TANGGAL_TIDAK_SAH` | tanggal lahir tidak terbaca atau di masa depan |
| `WILAYAH_TIDAK_DIKENAL` | kelurahan/kecamatan tidak dapat dipadankan |
| `WILAYAH_BUKAN_HAK` | pendata mengunggah kelurahan selain miliknya |
| `DI_LUAR_KAWASAN_RAWAN` | RT/RW belum ditetapkan sebagai kawasan rawan |
| `PILIHAN_TIDAK_SAH` | nilai pilihan di luar daftar |
| `KEBUTUHAN_KHUSUS_KOSONG` | "ya" tanpa jenis kebutuhan khusus |
| `KOORDINAT_TIDAK_SAH` | lintang/bujur bukan angka atau di luar wilayah Kota Banjarmasin dan sekitarnya |
| `WARGA_TIDAK_TERDAFTAR` | (Form 5.A.2) NIK tidak ditemukan pada daftar warga tahun itu |
| `KERAWANAN_KOSONG` | (Form 5.A.2) tidak ada satu pun jenis kerawanan yang dicentang |

Setiap galat memuat nomor baris lembar kerja, nomor kolom formulir, kode, dan pesan bahasa
Indonesia. Peringatan (tidak menolak baris): KK yang sama di kelurahan berbeda; kemungkinan
orang ganda tanpa NIK.

## Impor Form 5.A.2

Tiap baris dicocokkan ke `resident_records` tahun itu lewat `nik_hash`. Kolom 9-18 dibaca
sebagai centang jenis kerawanan dan menimpa `hazard_mask` (dengan `hazard_source = impor`);
kolom data diri hanya dipakai untuk pencocokan dan tidak mengubah data warga. Pratinjau
menampilkan jumlah warga yang kerawanannya berubah.

## Penanganan berkas

Berkas unggahan disimpan terenkripsi, lalu dihapus saat impor dikonfirmasi atau dibatalkan.
Nilai baris disimpan terenkripsi (`import_rows.payload_enc`) dan dikosongkan pada saat yang
sama. Impor yang tidak ditindaklanjuti dibatalkan otomatis setelah 7 hari. Daftar galat dibuat
saat diminta dan tidak disimpan.

## Idempotensi

Kunci alami `(tahun anggaran, nik_hash)`; untuk orang tanpa NIK `(nama, tanggal lahir, kk_hash)`.
Unggah ulang berkas yang sama menghasilkan nol baris baru dan nol baris berubah. Sidik berkas
(`file_sha256`) yang sudah pernah dikonfirmasi memunculkan peringatan sebelum validasi.

## Templat

`GET /spm/templates/:formCode` menghasilkan templat kosong dengan kepala resmi, validasi sel
(daftar pilihan, panjang NIK), dan daftar kelurahan milik pengguna. RT/RW kawasan rawan
disertakan pada lembar rujukan.

## Jaminan (diuji otomatis)

- Tidak ada baris ditolak tanpa kode galat, nomor baris, dan nomor kolom.
- Berkas campuran (benar + salah) menyimpan tepat baris yang benar.
- Setelah konfirmasi, pembatalan, atau 7 hari: berkas unggahan terhapus dan
  `import_rows.payload_enc` kosong; tidak ada NIK/KK polos pada tabel impor kapan pun.
- Impor 1.000 baris selesai tervalidasi dalam ≤ 15 detik pada lingkungan uji.
