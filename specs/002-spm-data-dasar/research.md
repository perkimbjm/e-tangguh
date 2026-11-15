# Research: Data Dasar SPM Sub-Urusan Bencana (Form 5.A)

Keputusan berasal dari pengetahuan umum penyusun dan dari struktur berkas kerja SPM BPBD TA 2026,
bukan dari uji coba. Tumpukan teknologi mengikuti fitur `001-basis-data-relawan` (React + Vite,
NestJS, PostgreSQL + PostGIS, Drizzle, Zod). Arah perancangan: lebih mudah, lebih cepat, lebih
otomatis, lebih efisien, lebih efektif; setiap keputusan menyebut otomatisasi yang dihasilkannya.

## R1. Satu catatan orang untuk semua modul

- **Decision**: tabel `persons` (identitas tetap) dan `families` (nomor KK) dipakai bersama;
  `volunteers` (fitur 001) merujuk `person_id`. Keunikan lewat `nik_hash` (HMAC) seperti fitur
  001; NIK dan nomor KK terenkripsi per kolom.
- **Rationale**: Prinsip III konstitusi; petugas pada Form 5.A.5/5.A.11 sering sekaligus relawan
  dan warga. Data diri diketik satu kali.
- **Alternatives considered**: tabel orang terpisah per modul (data ganda, rekap salah hitung).
- **Dampak**: `data-model.md` fitur 001 diselaraskan; belum ada kode sehingga tanpa migrasi.

## R2. Data per tahun anggaran

- **Decision**: baris tahunan eksplisit (`resident_records`, `officer_records`, inventaris,
  kawasan rawan) ber-`fiscal_year_id`. Membuka tahun baru = menyalin baris tahun sebelumnya
  dengan satu perintah `INSERT ... SELECT` per tabel dalam satu transaksi.
- **Rationale**: cocok dengan formulir yang dilaporkan per tahun; kueri rekap sederhana; salin
  maju otomatis menghapus pengetikan ulang.
- **Alternatives considered**: tabel bertanggal berlaku (kueri rumit, mudah salah); tabel
  temporal sistem (berlebihan untuk siklus tahunan).

## R3. Finalisasi dan revisi bernomor

- **Decision**: status tahun anggaran `terbuka → final → revisi(n) → final`. Saat finalisasi,
  sistem membuat arsip tak-berubah berisi seluruh berkas ekspor (XLSX + PDF) dan cuplikan data
  rekap (JSON) dengan sidik SHA-256. Penguncian ditegakkan di layanan dan oleh pemicu basis data
  yang menolak tulis pada tahun berstatus `final`.
- **Rationale**: yang harus dipertahankan adalah laporan yang pernah disampaikan; arsip berkas
  jauh lebih sederhana daripada versi per baris, dan langsung dapat diunduh ulang.
- **Alternatives considered**: riwayat versi per baris (rumit, lambat); hanya mengandalkan jejak
  audit (tidak dapat mereproduksi laporan lama dengan pasti).

## R4. Impor lembar kerja

- **Decision**: unggahan XLSX diproses di server dengan pembaca beraliran (ExcelJS), masuk tabel
  antara (`import_batches`, `import_rows` berisi nilai mentah + daftar galat), divalidasi dengan
  skema Zod bersama, ditampilkan sebagai pratinjau, lalu disimpan dalam satu transaksi setelah
  dikonfirmasi. Sinkron, batas 20.000 baris per berkas.
- **Otomatisasi**:
  - baris kepala dideteksi dari baris penomoran kolom ("1, 2, 3, …") sehingga berkas dengan atau
    tanpa kepala laporan sama-sama diterima;
  - nama kecamatan/kelurahan dicocokkan otomatis ke wilayah resmi dengan kemiripan trigram
    (`pg_trgm`); yang yakin dipetakan langsung, yang ragu ditawarkan sebagai pilihan;
  - nilai pilihan dinormalkan (L/P, ya/tidak, miskin/tidak miskin, tanda centang);
  - unggah ulang bersifat idempoten: kunci alami `(tahun, nik_hash)` membedakan baris baru,
    berubah, dan tidak berubah;
  - templat resmi dapat diunduh dari sistem, sudah berisi daftar pilihan dan validasi sel.
- **Rationale**: 1.000 baris selesai dalam hitungan detik tanpa antrean pekerjaan; tabel antara
  memberi pratinjau dan laporan galat tanpa menyentuh data utama.
- **Alternatives considered**: antrean pekerjaan latar (layanan tambahan, tidak perlu pada skala
  ini); parsing di peramban (data pribadi diproses di perangkat, validasi ganda); impor CSV saja
  (formulir resmi beredar sebagai XLSX).

## R5. Rekapitulasi yang dapat ditelusuri

- **Decision**: setiap sel rekap didefinisikan satu kali sebagai *definisi sel* (formulir, kunci
  baris, kunci kolom → predikat kueri) di modul `spm/recap`. Definisi yang sama dipakai untuk
  menghitung angka (agregat SQL) dan untuk menelusuri baris penyusunnya. Dihitung saat diminta;
  tanpa tabel rekap tersimpan kecuali cuplikan saat finalisasi.
- **Rationale**: satu sumber kebenaran menjamin angka dan daftar penyusunnya selalu sama (Prinsip
  VII); agregat atas 200.000 baris berindeks masih jauh di bawah target 5 detik.
- **Alternatives considered**: materialized view (perlu penyegaran, penelusuran terpisah); angka
  rekap disimpan (bisa basi dan menyimpang dari rincian).

## R6. Kelompok variasi kerawanan

- **Decision**: sepuluh jenis bencana disimpan sebagai bitmask (`hazard_mask smallint`) pada
  baris warga. Variasi kerawanan adalah nilai bitmask yang berbeda; nomor variasi per tahun
  diurutkan menurut bitmask. Nilai awal diisi otomatis dari kawasan rawan (RT/RW) warga.
- **Rationale**: kombinasi jenis bencana menjadi satu nilai yang mudah dikelompokkan untuk Form
  5.A.3; pendata tidak perlu menomori variasi.
- **Alternatives considered**: tabel relasi warga-bencana (pengelompokan kombinasi lebih mahal);
  nomor variasi diketik manual (tidak konsisten antar kelurahan).

## R7. Ekspor formulir resmi

- **Decision**: susunan tiap formulir (judul, kepala bertingkat, sel gabung, penomoran kolom,
  pemetaan kolom → sumber data) disimpan sebagai *definisi formulir* berversi di paket bersama.
  Satu mesin ekspor menghasilkan XLSX (ExcelJS) dan PDF (pdfmake, lanskap) dari definisi yang
  sama. Tersedia ekspor satu formulir, satu kelurahan, atau satu paket seluruh Form 5.A (ZIP).
- **Rationale**: perubahan format resmi cukup mengubah definisi, bukan kode; XLSX dan PDF tidak
  mungkin berbeda isi.
- **Alternatives considered**: berkas templat XLSX yang diisi (sulit untuk kolom variasi yang
  jumlahnya dinamis pada 5.A.3); PDF lewat peramban tanpa kepala (dependensi ratusan MB).

## R8. Alur persetujuan data kelurahan

- **Decision**: status baris `menunggu → disetujui | dikembalikan`. Persetujuan dilakukan per
  kelompok (per berkas impor atau per kelurahan) dengan satu tindakan; pengecualian per baris
  tetap mungkin. Hanya baris `disetujui` yang masuk rekap dan ekspor resmi.
- **Rationale**: operator BPBD tidak menyetujui ribuan baris satu per satu.

## R9. Peran dan cakupan akses

- **Decision**: menambah peran `operator_bpbd` dan `pendata_kelurahan` pada peran fitur 001.
  Pendata terikat satu kelurahan (`users.kelurahan_id`); pembatasan ditegakkan guard NestJS dan
  disaring pada setiap kueri. Finalisasi, revisi, dan penetapan kawasan rawan hanya `admin_bpbd`.
- **Alternatives considered**: keamanan tingkat baris di basis data (kuat, tetapi menambah
  kerumitan operasional bagi tim kecil); ditinjau ulang bila jumlah peran bertambah.

## R10. Perlindungan data pada skala besar

- **Decision**: NIK, nomor KK, alamat rinci, dan jenis kebutuhan khusus dienkripsi per kolom.
  Penanda yang harus dijumlahkan untuk rekap (kondisi ekonomi miskin, berkebutuhan khusus,
  kelompok umur, status korban) disimpan sebagai kolom biasa, dilindungi kontrol akses, enkripsi
  volume basis data, dan cadangan terenkripsi. NIK dicari lewat `nik_hash`; nama lewat indeks
  trigram.
- **Rationale**: nilai terenkripsi per kolom tidak dapat dijumlahkan di basis data; mendekripsi
  200.000 baris di aplikasi untuk setiap rekap melanggar target kinerja dan memperluas paparan
  data. Dicatat sebagai penyimpangan beralasan pada `plan.md`
  dan disetujui pemilik proyek pada 2026-11-15 untuk fitur ini.
- **Alternatives considered**: mengenkripsi semua kolom sensitif (rekap tidak layak); tabel
  agregat terpisah (data ganda yang bisa menyimpang).

## R11. Kejadian bencana

- **Decision**: status darurat disimpan sebagai waktu penetapan (boleh kosong); kategori "tidak
  dikeluarkan / dikeluarkan < 24 jam / > 24 jam" dihitung dari selisih waktu laporan diterima
  dan waktu penetapan. Lokasi kejadian memakai kelurahan dan titik `geography(Point,4326)`
  opsional.
- **Rationale**: pendata mengisi fakta, sistem mengisi kolom centang.

## R12. Hitungan aparatur per kelurahan (Form 5.A.4)

- **Decision** (terkonfirmasi BPBD 2026-11-15): aparatur di kawasan rawan bencana adalah personel
  yang bertugas di kelurahan itu. Tiap petugas memiliki jabatan dan kelurahan wilayah tugas;
  hitungan memakai kelurahan wilayah tugas, bukan domisili. Pemetaan ke kolom formulir:
  Kasi Trantibumlinmas kelurahan → PNS; Babinsa → TNI; Bhabinkamtibmas → POLRI; Linmas di bawah
  Satpol PP → Satlinmas; tenaga kontrak → tenaga kontrak; relawan kebencanaan → non-aparatur.
- **Tafsir penyusun**: Form 5.A.4 tidak memiliki kolom relawan, sehingga jumlah relawan per
  kelurahan ditulis otomatis pada kolom keterangan ("Relawan: n orang"). Perlu dikonfirmasi.
- **Otomatisasi**: memilih jabatan mengisi status kepegawaian secara otomatis; relawan
  terverifikasi dari modul relawan dapat dijadikan petugas tanpa ketik ulang.

## R13. Pengujian

- **Decision**: uji unit untuk aturan validasi, definisi sel rekap, dan definisi formulir; uji
  integrasi terhadap PostgreSQL/PostGIS nyata untuk impor, rekap, penguncian, dan matriks akses;
  uji "berkas emas" yang membandingkan struktur kepala ekspor XLSX dengan templat resmi kosong;
  uji beban rekap pada 200.000 baris sintetis.
- **Data uji**: seluruhnya sintetis, dihasilkan skrip. Berkas kerja nyata tidak masuk repositori.

## Sisa ketidakpastian (bukan penghalang rencana)

Jumlah warga di kawasan rawan, penempatan jumlah relawan pada Form 5.A.4 (R12),
kepastian format formulir yang berlaku, dan dasar hukum pemrosesan data warga. Tidak ada NEEDS
CLARIFICATION teknis yang tersisa.
