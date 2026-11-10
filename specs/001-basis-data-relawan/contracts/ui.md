# Contract: Antarmuka

## Rute

| Rute | Peran | Isi |
|---|---|---|
| `/` | publik | pengantar, statistik agregat, ajakan mendaftar |
| `/daftar`, `/masuk` | publik | pendaftaran dengan persetujuan, masuk |
| `/profil` | relawan | profil, bukti, penugasan, ketersediaan, persetujuan |
| `/profil/kartu` | relawan | kartu sendiri + dasar perhitungan + ajukan koreksi |
| `/relawan` | admin, pengurus | galeri kartu ⇄ tabel, filter, pilih untuk dibandingkan/tim |
| `/relawan/:id` | admin, pengurus | detail, radar + tabel nilai, riwayat |
| `/bandingkan` | admin | hingga 3 relawan berdampingan |
| `/tim`, `/tim/:id` | admin | susun tim per slot klaster, ringkasan komposisi, ekspor |
| `/verifikasi` | admin | antrean tinjauan |
| `/organisasi`, `/organisasi/:id` | relawan, pengurus, admin | |
| `/peta` | admin (titik), publik (agregat) | MapLibre, dimuat malas |
| `/dasbor` | admin | statistik dan ekspor |
| `/admin/*` | super admin | pengguna, rujukan, rumus, jejak audit |

## Komponen kartu relawan

Isi kartu: foto, nama, klaster utama (ikon + teks), nilai keseluruhan, enam atribut (kode +
angka), status ketersediaan (ikon + teks), lencana organisasi. Tidak memuat NIK, kontak, atau
data kesehatan.

Aturan mengikat:

- Desain orisinal: palet, bentuk kartu, tipografi, dan ikon buatan sendiri; DILARANG meniru nama,
  logo, aset, atau tata letak khas gim komersial.
- Tingkatan warna kartu (bila dipakai) selalu disertai label teks.
- Setiap diagram radar disertai tabel nilai yang terbaca pembaca layar.
- Galeri dan tabel memakai sumber data dan filter yang sama; pilihan tampilan diingat per
  perangkat.
- Animasi (balik kartu, transisi) nonaktif pada `prefers-reduced-motion`.
- Semua tindakan dapat dijalankan dengan keyboard; fokus terlihat; kontras ≥ 4,5:1.
- Target sentuh ≥ 44×44 px; tata letak mulai dari lebar 360 px.

## Anggaran kinerja (diuji di CI)

| Ukuran | Batas |
|---|---|
| JavaScript awal rute `/relawan` dan `/relawan/:id` | ≤ 250 KB gzip |
| LCP rute `/relawan` pada profil "Slow 4G", ponsel kelas menengah | ≤ 3 detik |
| `GET /volunteers` p95 pada 10.000 relawan | ≤ 500 ms |
| Foto kartu | ≤ 40 KB, WebP, dimuat malas |
| MapLibre dan berkas PMTiles | hanya dimuat pada `/peta` |

## Perilaku saat gangguan

- API gagal: daftar terakhir yang sudah tampil tetap terlihat dengan penanda "data mungkin tidak
  terbaru"; tindakan tulis dinonaktifkan dengan pesan jelas.
- Ubin peta gagal dimuat: tampilan beralih ke tabel agregat per wilayah.
- Data pribadi tidak disimpan di cache peramban yang persisten.
