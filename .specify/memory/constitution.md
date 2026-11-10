# e-Tangguh Constitution

Basis data relawan kebencanaan untuk BPBD Kota Banjarmasin: memudahkan BPBD mengelola data
relawan dan memudahkan relawan mengelola profil serta keterlibatannya.

Kata kunci WAJIB, DILARANG, dan SEBAIKNYA dipakai dengan arti normatif (setara MUST, MUST NOT,
SHOULD).

## Core Principles

### I. Perlindungan Data Pribadi Sejak Rancangan (NON-NEGOTIABLE)

- Setiap atribut data relawan WAJIB memiliki tujuan pemrosesan yang tertulis di spesifikasi;
  atribut tanpa tujuan DILARANG dikumpulkan (minimisasi data).
- Data pribadi WAJIB dikumpulkan dengan persetujuan eksplisit relawan yang tercatat (waktu,
  versi pernyataan persetujuan), dan relawan WAJIB dapat melihat, memperbaiki, menarik
  persetujuan, serta meminta penghapusan datanya.
- Data sensitif (NIK, data kesehatan seperti golongan darah dan riwayat penyakit, kontak darurat,
  alamat rinci, dokumen identitas) WAJIB dienkripsi saat disimpan dan saat dikirim, serta
  DILARANG tampil di halaman publik, log aplikasi, URL, dan berkas ekspor tanpa hak akses khusus.
- Tampilan publik atau lintas-organisasi WAJIB hanya memuat data yang disetujui relawan untuk
  ditampilkan; NIK WAJIB disamarkan di semua tampilan selain layar verifikasi admin.
- Masa simpan data WAJIB ditetapkan; data relawan nonaktif melewati masa simpan WAJIB dihapus
  atau dianonimkan.

Alasan: aplikasi menyimpan data pribadi warga, termasuk data kesehatan. Kebocoran merugikan
relawan dan menimbulkan tanggung jawab hukum bagi BPBD selaku pengendali data.

### II. Akses Berbasis Peran dan Jejak Audit

- Setiap fitur WAJIB mendefinisikan peran yang boleh mengaksesnya (minimal: relawan, pengurus
  organisasi relawan, admin BPBD, super admin); akses default adalah ditolak.
- Otorisasi WAJIB ditegakkan di sisi server untuk setiap permintaan; penyembunyian elemen
  antarmuka saja tidak dihitung sebagai kontrol akses.
- Setiap pembuatan, perubahan, penghapusan, verifikasi, ekspor, dan pembukaan data sensitif
  WAJIB tercatat di jejak audit (siapa, kapan, apa, dari mana) yang tidak dapat diubah oleh
  pengguna aplikasi.
- Kredensial dan rahasia DILARANG disimpan di repositori.

Alasan: data dipakai banyak pihak dengan kepentingan berbeda; akuntabilitas instansi pemerintah
menuntut setiap akses dapat ditelusuri.

### III. Data Terverifikasi dan Atribut Berbasis Bukti

- Setiap data relawan WAJIB memiliki status verifikasi (mis. draf, diajukan, terverifikasi,
  ditolak) dan hanya admin BPBD yang berwenang yang dapat memverifikasi.
- Nilai atribut pada kartu relawan (gaya kartu pemain) WAJIB dihitung dari bukti yang dapat
  diperiksa: sertifikat, riwayat pelatihan, riwayat penugasan, masa aktif. Rumus perhitungan
  WAJIB terdokumentasi, deterministik, dan dapat dijelaskan kepada relawan yang bersangkutan.
- Atribut DILARANG diturunkan dari karakteristik yang diskriminatif (agama, suku, jenis kelamin,
  disabilitas, kondisi kesehatan) dan DILARANG ditampilkan sebagai penilaian atas pribadi
  relawan; atribut menggambarkan kompetensi dan kesiapan, bukan nilai seseorang.
- Relawan WAJIB dapat melihat dasar perhitungan atributnya dan mengajukan koreksi.
- Duplikasi relawan WAJIB dicegah dengan pengenal unik yang tervalidasi.

Alasan: keputusan mobilisasi diambil dari data ini. Angka yang tidak berdasar bukti menyesatkan
penugasan dan tidak adil bagi relawan.

### IV. Antarmuka Visual yang Tetap Fungsional dan Aksesibel

- Antarmuka WAJIB dirancang mobile-first dan berbahasa Indonesia.
- Presentasi visual bergaya pemilihan pemain (kartu, atribut, diagram radar, filter cepat)
  WAJIB selalu memiliki padanan tampilan tabel/daftar yang memuat informasi yang sama.
- Informasi DILARANG disampaikan hanya lewat warna atau animasi; animasi WAJIB menghormati
  preferensi reduced-motion; kontras dan navigasi keyboard WAJIB memenuhi WCAG 2.1 tingkat AA.
- Halaman pencarian dan detail relawan WAJIB dapat dipakai pada koneksi seluler lambat; anggaran
  kinerja (ukuran halaman, waktu muat) WAJIB ditetapkan di rencana implementasi dan diuji.
- Desain visual WAJIB orisinal: DILARANG memakai nama, logo, aset, atau tata letak khas milik
  gim komersial mana pun.

Alasan: tampilan menarik meningkatkan adopsi, tetapi aplikasi ini dipakai saat darurat, di
lapangan, pada perangkat dan jaringan seadanya.

### V. Andal Saat Darurat dan Data Tidak Terkunci

- Alur kritis (mencari relawan menurut keahlian/wilayah/ketersediaan dan melihat kontaknya)
  WAJIB diidentifikasi di setiap spesifikasi dan memiliki perilaku terdefinisi saat layanan
  pendukung gagal.
- Data WAJIB dicadangkan terjadwal dan pemulihannya WAJIB pernah diuji sebelum rilis produksi.
- Data WAJIB dapat diekspor dalam format terbuka (CSV/XLSX/PDF) oleh peran yang berwenang,
  dengan ekspor tercatat di jejak audit.
- Perubahan skema basis data WAJIB melalui migrasi berversi yang dapat diulang.

Alasan: ketika bencana terjadi, kegagalan aplikasi berarti keterlambatan mobilisasi.

### VI. Sederhana, Teruji, dan Dapat Dirawat

- Solusi paling sederhana yang memenuhi spesifikasi WAJIB dipilih; kompleksitas tambahan WAJIB
  dijustifikasi tertulis di rencana implementasi.
- Aturan kontrol akses, perhitungan atribut, dan alur verifikasi WAJIB dicakup uji otomatis yang
  berjalan di CI; perubahan yang menggagalkan uji DILARANG digabung.
- Komponen pihak ketiga WAJIB berlisensi kompatibel dengan lisensi repositori dan masih
  dipelihara aktif.
- Cara instalasi, konfigurasi, dan pengoperasian WAJIB terdokumentasi dalam bahasa Indonesia
  sehingga dapat dijalankan tim TI pemerintah daerah tanpa pengembang asli.

Alasan: aplikasi akan dirawat tim kecil dengan anggaran terbatas dalam jangka panjang.

## Batasan Tambahan

- Kepatuhan regulasi: rancangan WAJIB mengacu pada UU No. 27 Tahun 2022 tentang Pelindungan
  Data Pribadi, kebijakan SPBE dan Satu Data Indonesia, serta pedoman relawan penanggulangan
  bencana BNPB. Rujukan pasal dan kewajiban rinci WAJIB dikonfirmasi oleh pejabat berwenang
  BPBD/Diskominfo/bagian hukum sebelum rilis produksi; konstitusi ini bukan nasihat hukum.
- Data produksi DILARANG dipakai di lingkungan pengembangan atau pengujian; data contoh WAJIB
  sintetis.
- Tumpukan teknologi yang ditetapkan: antarmuka WAJIB dibangun dengan React di atas Vite; basis
  data WAJIB PostgreSQL dengan ekstensi PostGIS; peta WAJIB memakai MapLibre GL JS. Penggantian
  salah satunya memerlukan amendemen konstitusi.
- Data lokasi (domisili, wilayah tugas, batas kecamatan/kelurahan) WAJIB disimpan sebagai tipe
  geometri/geografi PostGIS dengan SRID yang dinyatakan eksplisit (EPSG:4326 untuk penyimpanan),
  dan kueri spasial WAJIB dijalankan di basis data, bukan di peramban.
- Aplikasi peramban DILARANG terhubung langsung ke basis data dengan kredensial berhak istimewa;
  seluruh akses data WAJIB melewati lapisan server yang menegakkan Prinsip II.
  Teknologi lapisan server ditetapkan di rencana implementasi fitur (`plan.md`).
- Sumber ubin peta (tile) dan gaya peta WAJIB memiliki lisensi serta ketentuan pakai yang
  mengizinkan penggunaan oleh instansi pemerintah, dengan atribusi ditampilkan. Titik lokasi
  relawan perorangan DILARANG ditampilkan pada peta publik; tampilan publik WAJIB berupa agregat
  per wilayah.
- Lokasi hosting ditetapkan di rencana implementasi (`/speckit-plan`) dan WAJIB memenuhi
  ketentuan penempatan data instansi pemerintah yang berlaku.
- Integrasi dengan layanan pihak ketiga (peta, notifikasi, pesan) DILARANG mengirim data pribadi
  melebihi yang diperlukan fungsi tersebut.

## Alur Kerja Pengembangan

- Setiap fitur melalui urutan Spec Kit: spesifikasi, klarifikasi bila perlu, rencana, daftar
  tugas, implementasi.
- Setiap spesifikasi WAJIB memuat: peran yang terlibat, data pribadi yang disentuh beserta
  tujuannya, dan alur kritisnya.
- Setiap rencana WAJIB memuat pemeriksaan kesesuaian terhadap keenam prinsip; pelanggaran WAJIB
  dicatat beserta justifikasi dan alternatif yang ditolak.
- Perubahan masuk lewat pull request yang ditinjau minimal satu orang selain penulisnya dan lolos
  CI.

## Governance

- Konstitusi ini mengungguli praktik lain di proyek. Bila bertentangan, konstitusi yang berlaku
  atau konstitusi diamendemen lebih dahulu.
- Amendemen diajukan lewat pull request yang mengubah berkas ini, memuat alasan dan dampak ke
  spesifikasi/rencana berjalan, dan disetujui pemilik proyek.
- Versi mengikuti semantic versioning: MAJOR untuk penghapusan atau redefinisi prinsip yang tidak
  kompatibel, MINOR untuk prinsip/bagian baru atau perluasan material, PATCH untuk klarifikasi
  redaksi.
- Kepatuhan diperiksa pada setiap tinjauan rencana dan pull request, serta ditinjau ulang
  menyeluruh sebelum setiap rilis produksi.

**Version**: 1.1.1 | **Ratified**: 2026-11-10 | **Last Amended**: 2026-11-10
