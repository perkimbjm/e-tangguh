# Contract: Rumus Atribut Kartu Relawan (versi rumus 1)

Fungsi murni `computeAttributes(input, weights, today) → { kmp, lat, png, sia, sen, kep, overall,
breakdown }`. Hanya bukti dan penugasan berstatus `terverifikasi` dan belum kedaluwarsa yang
menjadi masukan. Keluaran bilangan bulat 1-99. Angka ambang di bawah adalah usulan awal yang
disimpan di `formula_versions.weights` dan WAJIB disetujui BPBD sebelum dipakai.

`skala(x, maks) = clamp(round(1 + 98 * min(x, maks) / maks), 1, 99)`

| Kode | Atribut | Masukan | Perhitungan |
|---|---|---|---|
| KMP | Kompetensi | sertifikat aktif | poin: dasar 1, lanjutan 2, ahli 3; `skala(jumlah poin, 10)` |
| LAT | Pelatihan | jam pelatihan 5 tahun terakhir | `skala(total jam, 120)` |
| PNG | Pengalaman | hari penugasan | `skala(total hari, 60)` |
| SIA | Kesiapan | status ketersediaan, kesegaran data | siaga 70 / terbatas 40 / tidak tersedia 1; +29 bila profil dan ketersediaan diperbarui ≤ 180 hari, +15 bila ≤ 365 hari |
| SEN | Masa Bakti | `joined_at` terverifikasi | `skala(tahun aktif, 10)` |
| KEP | Kepemimpinan | penugasan sebagai koordinator, peran pengurus aktif | poin: tiap penugasan koordinator 2, pengurus aktif 2; `skala(poin, 10)` |

`overall = round(0.25*KMP + 0.15*LAT + 0.25*PNG + 0.15*SIA + 0.10*SEN + 0.10*KEP)`

## Aturan yang mengikat

- Deterministik: masukan dan tanggal yang sama menghasilkan keluaran yang sama.
- `breakdown` memuat, per atribut, daftar id bukti/penugasan beserta kontribusinya, sehingga
  antarmuka dapat menjelaskan nilai tanpa menghitung ulang.
- DILARANG memakai jenis kelamin, usia, agama, suku, disabilitas, data kesehatan, organisasi,
  atau wilayah sebagai masukan.
- Perubahan ambang atau bobot = `formula_versions` baru; seluruh snapshot dihitung ulang dan
  kejadian itu tercatat di jejak audit.
- Label antarmuka: "kompetensi dan kesiapan", bukan penilaian pribadi; tidak ada peringkat publik.

## Kasus uji wajib

1. Tanpa bukti apa pun → semua atribut berbasis bukti bernilai 1; SIA mengikuti ketersediaan.
2. Sertifikat kedaluwarsa kemarin → tidak dihitung hari ini.
3. Bukti `diajukan`/`ditolak` → tidak dihitung.
4. Nilai di atas ambang maksimum → terpotong di 99.
5. Dua relawan identik kecuali jenis kelamin/usia → keluaran identik.
