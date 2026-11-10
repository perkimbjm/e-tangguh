# Quickstart: Validasi Basis Data Relawan e-Tangguh (MVP)

Panduan menjalankan dan membuktikan fitur bekerja. Perintah di bawah adalah target yang WAJIB
disediakan implementasi; belum ada sampai tugas terkait selesai.

## Prasyarat

- Node.js LTS dan pnpm
- Docker + Docker Compose
- Salinan `.env.example` → `.env` (kunci enkripsi dan HMAC dibuat acak; DILARANG di-commit)

## Menyiapkan

```bash
pnpm install
```

```bash
docker compose up -d db
```

```bash
pnpm db:migrate
```

```bash
pnpm db:seed
```

`db:seed` memuat data rujukan (klaster keahlian, wilayah, rumus versi 1) dan data contoh sintetis
(bukan data nyata).

```bash
pnpm dev
```

Antarmuka di `http://localhost:5173`, API di `http://localhost:3000/api/v1` (NestJS).

## Menguji

```bash
pnpm test
```

```bash
pnpm test:integration
```

```bash
pnpm test:e2e
```

```bash
pnpm check:bundle
```

## Skenario validasi

| # | Skenario | Hasil yang diharapkan | Rujukan |
|---|---|---|---|
| 1 | Daftar sebagai relawan baru, lengkapi profil, unggah satu sertifikat, ajukan | status `diajukan`; persetujuan tercatat dengan versi | US1, FR-001 |
| 2 | Daftar ulang dengan NIK yang sama | ditolak 409 tanpa menyebut pemilik | FR-002 |
| 3 | Masuk sebagai admin, verifikasi profil dan sertifikat | status `terverifikasi`; atribut terhitung; dua entri audit | US2, FR-005, FR-011 |
| 4 | Buka `/relawan`, filter klaster + kecamatan + siaga, alih ke tabel | hasil sama di kedua tampilan | US3, FR-007 |
| 5 | Buka detail, lihat "dasar perhitungan" | tiap nilai dirinci ke bukti; jumlah sesuai `contracts/attribute-formula.md` | FR-006 |
| 6 | Bandingkan 3 relawan, masukkan ke tim, ekspor XLSX | berkas terunduh; entri audit ekspor | FR-008, FR-009, FR-013 |
| 7 | Sebagai pengurus, panggil `/volunteers/:id/sensitive` | 403 | FR-010, SC-005 |
| 8 | Periksa respons `/volunteers` | tanpa NIK utuh, kesehatan, kontak darurat, alamat | FR-003, SC-005 |
| 9 | Buka `/peta` tanpa masuk | hanya agregat; wilayah berjumlah < 5 tersembunyi | FR-012 |
| 10 | Coba `UPDATE`/`DELETE` pada `audit_log` dengan peran basis data aplikasi | ditolak | Prinsip II |
| 11 | Tarik persetujuan sebagai relawan | relawan hilang dari `/volunteers` | FR-014 |
| 12 | Pindai aksesibilitas rute utama; aktifkan reduced-motion | nol pelanggaran serious/critical; animasi mati | FR-016, SC-006 |
| 13 | Cadangkan, hapus basis data, pulihkan | data dan berkas kembali; langkah terdokumentasi | Prinsip V |
| 14 | Daftar dengan tanggal lahir usia 14; lalu usia 16 tanpa dokumen izin wali | usia 14 ditolak; usia 16 tidak dapat diajukan sampai izin diunggah | FR-018 |
| 15 | Minta pemulihan kata sandi untuk email terdaftar dan tidak terdaftar | respons identik; token sekali pakai | FR-017 |

Skenario 1-12, 14, 15 WAJIB tercakup uji otomatis; skenario 13 dijalankan manual sebelum rilis produksi
dan hasilnya dicatat.
