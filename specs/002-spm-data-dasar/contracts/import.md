# Contract: Impor Lembar Kerja

## Berkas yang diterima

- Format `.xlsx`, maksimum 10 MB dan 20.000 baris data; satu lembar kerja per unggahan (pengguna
  memilih lembar bila berkas berisi lebih dari satu).
- Formulir: 5.A.1 (warga), 5.A.2 (kerawanan), 5.A.5 (petugas).
- Baris kepala ditemukan dari baris penomoran kolom; baris di atasnya (judul, provinsi, tahun)
  diabaikan kecuali tahun anggaran, yang harus sama dengan tahun tujuan bila tertulis.
- Kolom di luar formulir (misalnya kolom bantu berisi rumus) diabaikan.
- Susunan kolom yang tidak cocok dengan `form_definitions` menolak seluruh berkas dengan daftar
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

## Kolom bantu di luar formulir resmi (keputusan implementasi, perlu dikonfirmasi BPBD)

Form 5.A.1 resmi tidak memiliki kolom RT/RW maupun alasan NIK kosong, padahal FR-027 mewajibkan
pemeriksaan kawasan rawan per RT/RW. Karena itu:

- Templat sistem menambahkan kolom bantu tanpa nomor di kanan kolom 15: `RT`, `RW`, dan
  `ALASAN TANPA NIK`. Kolom bantu dikenali dari teks kepalanya; susunan kolom resmi tidak berubah.
- Bila kolom bantu RT/RW tidak ada, RT/RW diurai dari kolom 9 (alamat), mis. "RT 05 RW 02" atau
  "RT.005/RW.002".
- Bila NIK kosong, alasan diambil dari kolom bantu; teks tanpa angka pada sel NIK (mis. "belum ada")
  juga diterima sebagai alasan.
- Impor Form 5.A.2 hanya memperbarui jenis kerawanan warga yang sudah tercatat pada Form 5.A.1.

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
| `RT_RW_TIDAK_TERBACA` | RW tidak ada pada kolom bantu RT/RW maupun pada teks alamat (ditambahkan saat implementasi) |
| `WARGA_BELUM_TERCATAT` | baris Form 5.A.2 untuk orang yang belum tercatat pada Form 5.A.1 tahun yang sama (ditambahkan saat implementasi) |

Setiap galat memuat nomor baris lembar kerja, nomor kolom formulir, kode, dan pesan bahasa
Indonesia. Peringatan (tidak menolak baris): KK yang sama di kelurahan berbeda; kemungkinan
orang ganda tanpa NIK.

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
- NIK/KK pada `import_rows` terhapus setelah konfirmasi, pembatalan, atau 7 hari. Selama masih
  ada, nilai NIK, KK, alamat, jenis kebutuhan khusus, dan alasan tanpa NIK disimpan terenkripsi
  (`FieldCipher`); berkas unggahan dihapus pada saat yang sama.
- Impor 1.000 baris selesai tervalidasi dalam ≤ 15 detik pada lingkungan uji.
