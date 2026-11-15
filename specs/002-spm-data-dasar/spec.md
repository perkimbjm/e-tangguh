# Feature Specification: Data Dasar SPM Sub-Urusan Bencana (Form 5.A)

**Feature Branch**: `claude/affectionate-edison-hu6uwc`

**Created**: 2026-11-15

**Status**: Draft

**Input**: User description: "Basis data dasar SPM sub-urusan bencana (Form 5.A.1–5.A.12 Permendagri 101/2018) per tahun anggaran untuk BPBD Kota Banjarmasin: satu catatan orang per NIK dengan peran warga kawasan rawan bencana, korban, petugas/aparatur, relawan; pendataan warga per kelurahan dengan impor XLSX tervalidasi; jenis kerawanan tempat tinggal; daftar petugas dengan sertifikasi dan penugasan; inventaris peralatan dan stok logistik; kejadian bencana, warga terdampak dan status korban; rekapitulasi 5.A.3, 5.A.4, 5.A.6 dihitung otomatis dan dapat ditelusuri; ekspor XLSX/PDF sesuai susunan kolom formulir resmi; penguncian data per tahun anggaran dengan revisi bernomor. Form 5.B–5.E (perhitungan kebutuhan, rencana, realisasi, kinerja) menjadi fitur terpisah berikutnya."

## Clarifications

### Session 2026-11-15

- Q: Warga mana yang dicatat dalam daftar warga kawasan rawan bencana? → A: Hanya warga yang tinggal di RT/kawasan yang ditetapkan rawan bencana menurut Kajian Risiko Bencana atau penetapan BPBD.
- Q: Siapa yang mengisi data warga kawasan rawan bencana? → A: Pendata kelurahan (terbatas pada kelurahannya) dan operator BPBD; data dari pendata kelurahan diperiksa dan disetujui operator BPBD sebelum dihitung dalam rekapitulasi.
- Q: Batas usia mana yang dipakai untuk kelompok umur rentan? → A: Balita (di bawah 5 tahun), anak (5 sampai di bawah 18 tahun), dan lanjut usia (60 tahun ke atas), dihitung dari tanggal lahir; batas dapat diubah admin.
- Q: Bagaimana warga yang belum punya NIK diperlakukan? → A: Tetap dicatat dengan penanda "NIK belum ada", ikut dihitung dalam jumlah jiwa, dan jumlahnya ditampilkan terpisah.
- Q: Daftar siapa yang dimaksud Form 5.A.9? → A: Warga terdampak/korban pada satu kejadian bencana; diisi per kejadian dan menjadi dasar Form 5.A.10.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pendataan warga di kawasan rawan bencana per kelurahan (Priority: P1)

Pendata kelurahan (untuk kelurahannya sendiri) atau operator BPBD membuka tahun anggaran
berjalan, memilih satu kelurahan, lalu mengisi daftar warga
(nama kepala keluarga dan anggota keluarga, NIK, nomor KK, jenis kelamin, tempat dan tanggal
lahir, alamat, kondisi ekonomi, kebutuhan khusus, kelompok umur rentan) beserta jenis kerawanan
tempat tinggalnya. Pengisian dapat dilakukan satu per satu atau dengan mengunggah lembar kerja
kelurahan dalam format formulir resmi. Sistem memeriksa setiap baris dan menunjukkan baris yang
bermasalah sebelum data diterima.

**Why this priority**: Form 5.A.1 dan 5.A.2 adalah sumber seluruh rekapitulasi dan perhitungan
SPM. Saat ini pengisiannya manual per kelurahan, tidak seragam, dan belum lengkap.

**Independent Test**: Unggah lembar kerja satu kelurahan berisi baris benar dan baris salah;
baris benar tersimpan, baris salah dilaporkan dengan alasannya, dan Form 5.A.1 serta 5.A.2
kelurahan itu dapat diekspor dalam susunan kolom resmi.

**Acceptance Scenarios**:

1. **Given** tahun anggaran terbuka dan sebuah lembar kerja kelurahan, **When** operator
   mengunggahnya, **Then** sistem menampilkan ringkasan pratinjau (jumlah baris diterima,
   ditolak, dan duplikat) sebelum operator mengonfirmasi penyimpanan.
2. **Given** baris dengan NIK yang bukan 16 digit, **When** diunggah, **Then** baris itu ditolak
   dengan alasan yang menyebut nomor baris dan kolomnya.
3. **Given** NIK yang sudah tercatat pada kelurahan lain di tahun yang sama, **When** diunggah,
   **Then** sistem tidak membuat catatan orang kedua dan meminta operator memilih kelurahan
   domisili yang benar.
4. **Given** nama kelurahan atau kecamatan yang salah ketik, **When** diunggah, **Then** sistem
   menawarkan padanan dari daftar wilayah resmi dan tidak menyimpan ejaan bebas.
5. **Given** seorang warga tercatat, **When** operator menandai jenis kerawanan tempat
   tinggalnya, **Then** kelompok variasi kerawanan warga itu ditentukan sistem dari kombinasi
   jenis bencana yang ditandai.

---

### User Story 2 - Rekapitulasi otomatis dan ekspor formulir resmi (Priority: P1)

Kepala bidang atau operator BPBD membuka rekapitulasi tahun anggaran: jumlah KK dan jiwa per
kelurahan menurut kelompok kerawanan (5.A.3), jumlah aparatur dan warga beserta kerentanannya
per kelurahan (5.A.4), serta jumlah penduduk, KK, desa/kelurahan, dan petugas per jenis bencana
(5.A.6). Setiap angka dapat dibuka untuk melihat daftar baris penyusunnya. Seluruh formulir
dapat diunduh sebagai berkas spreadsheet dan dokumen siap cetak.

**Why this priority**: Rekapitulasi adalah bahan langsung pelaporan dan menjadi masukan
perhitungan kebutuhan pada formulir berikutnya. Rekap manual adalah sumber kesalahan utama.

**Independent Test**: Dengan data rincian yang diketahui jumlahnya, angka pada 5.A.3, 5.A.4, dan
5.A.6 sama dengan hitungan manual, dan berkas ekspor memiliki judul, urutan, dan penomoran kolom
yang sama dengan formulir resmi.

**Acceptance Scenarios**:

1. **Given** data warga dan petugas tersimpan, **When** rekapitulasi dibuka, **Then** angka
   dihitung dari data rincian tanpa isian manual.
2. **Given** sebuah angka pada rekapitulasi, **When** pengguna berwenang membukanya, **Then**
   tampil daftar orang atau baris yang membentuk angka itu.
3. **Given** data rincian berubah, **When** rekapitulasi dibuka kembali, **Then** angkanya
   mengikuti perubahan tersebut.
4. **Given** sebuah formulir 5.A, **When** diekspor, **Then** berkas memuat kepala laporan
   (provinsi, kabupaten/kota, tahun anggaran) dan kolom sesuai formulir resmi.

---

### User Story 3 - Daftar petugas dan aparatur (Priority: P2)

Operator mencatat petugas operasi penanggulangan bencana: data diri, status (PNS, TNI, POLRI,
Satlinmas, tenaga kontrak, non-aparatur), sertifikasi keahlian, jenis penugasan (TRC KLB, TRC
PDB, PPE, operasi tanggap darurat), dan lokasi penugasan (posko, pos lapangan). Relawan
terverifikasi dari basis data relawan dapat dipilih sebagai petugas non-aparatur tanpa mengetik
ulang data dirinya.

**Why this priority**: Form 5.A.5 dan 5.A.11 menentukan angka petugas pada rekapitulasi dan
jumlah wajib latih; datanya bertumpang tindih dengan basis data relawan yang sudah direncanakan.

**Independent Test**: Tambah satu petugas baru dan satu petugas yang dipilih dari relawan
terverifikasi; keduanya muncul pada Form 5.A.5 dan ikut terhitung pada 5.A.4 dan 5.A.6.

**Acceptance Scenarios**:

1. **Given** NIK petugas sudah tercatat sebagai warga atau relawan, **When** operator
   menambahkannya sebagai petugas, **Then** data dirinya dipakai ulang dan orang itu tetap satu
   catatan dengan lebih dari satu peran.
2. **Given** sertifikasi relawan sudah terverifikasi, **When** relawan itu dijadikan petugas,
   **Then** sertifikasinya tampil pada kolom sertifikasi tanpa diketik ulang.

---

### User Story 4 - Kejadian bencana, warga terdampak, dan petugas aktif (Priority: P2)

Saat atau setelah kejadian bencana, operator mencatat kejadian (nama, tanggal, waktu kejadian,
waktu laporan diterima, lokasi, status darurat: tidak dikeluarkan, dikeluarkan dalam 24 jam,
atau lebih dari 24 jam), lalu mencatat warga terdampak, status tiap korban (meninggal, hilang,
butuh bantuan medis darurat, butuh bantuan medis lanjut, selamat), serta petugas yang aktif pada
kejadian itu beserta lokasi penugasannya.

**Why this priority**: Form 5.A.9 sampai 5.A.12 menjadi dasar pengukuran pelayanan penyelamatan
dan evakuasi, tetapi baru terisi setelah ada kejadian sehingga tidak menghalangi pendataan awal.

**Independent Test**: Catat satu kejadian dengan tiga warga terdampak berstatus berbeda dan dua
petugas aktif; Form 5.A.9, 5.A.10, 5.A.11, dan 5.A.12 kejadian itu dapat diekspor.

**Acceptance Scenarios**:

1. **Given** warga sudah tercatat pada pendataan, **When** ditandai terdampak, **Then** data
   dirinya diambil dari catatan yang ada.
2. **Given** korban belum pernah tercatat (misalnya pendatang), **When** ditambahkan, **Then**
   sistem membuat catatan orang baru dengan data minimum dan menandainya belum lengkap.
3. **Given** status korban berubah, **When** diperbarui, **Then** perubahan dan waktunya tercatat
   dan status sebelumnya tetap dapat dilihat.

---

### User Story 5 - Inventaris peralatan dan stok logistik (Priority: P3)

Operator mencatat peralatan pendukung operasi tanggap darurat (nama, jumlah dan satuan, jenis
dukungan: kaji cepat, pencarian orang hilang, penanganan korban meninggal, penanganan medis,
fasilitas pengungsian; lokasi; institusi penanggung jawab; kondisi) dan stok logistik
pengungsian (nama barang, jumlah dan satuan, lokasi, institusi penanggung jawab, jumlah baik dan
rusak).

**Why this priority**: Form 5.A.7 dan 5.A.8 berdiri sendiri dan volumenya kecil.

**Independent Test**: Tambah lima peralatan dan lima barang logistik; keduanya dapat diekspor
dalam susunan kolom resmi.

**Acceptance Scenarios**:

1. **Given** jumlah baik dan rusak diisi, **When** disimpan, **Then** jumlahnya tidak boleh
   melebihi jumlah ketersediaan.

---

### User Story 6 - Tahun anggaran, finalisasi, dan revisi (Priority: P3)

Admin BPBD membuka tahun anggaran baru dengan menyalin data dasar tahun sebelumnya sebagai titik
awal, memfinalkan data tahun berjalan saat laporan disampaikan, dan membuka revisi bernomor bila
ada koreksi setelah finalisasi.

**Why this priority**: Diperlukan untuk siklus pelaporan tahunan, tetapi baru bernilai setelah
data tahun pertama terisi.

**Independent Test**: Finalkan satu tahun anggaran, pastikan datanya tidak dapat diubah, buka
revisi dengan alasan, ubah satu baris, dan pastikan versi final sebelumnya tetap dapat diekspor.

**Acceptance Scenarios**:

1. **Given** tahun anggaran sudah final, **When** operator mencoba mengubah data, **Then**
   perubahan ditolak dengan penjelasan.
2. **Given** revisi dibuka, **When** disimpan, **Then** revisi memiliki nomor, alasan, pembuat,
   dan waktu, serta versi sebelumnya tidak terhapus.
3. **Given** tahun anggaran baru dibuka dari tahun sebelumnya, **Then** data orang, wilayah
   kerawanan, petugas, dan inventaris tersalin sebagai keadaan awal, sedangkan kejadian bencana
   dan data korban tidak.

---

### Edge Cases

- Data kelurahan masih menunggu persetujuan saat tahun anggaran hendak difinalkan: finalisasi
  ditolak sampai seluruh data disetujui atau dikembalikan.
- Warga tanpa NIK (bayi baru lahir, belum memiliki dokumen): dicatat dengan penanda "NIK belum
  ada", ikut dihitung dalam jumlah jiwa, tidak ikut pemeriksaan keunikan NIK sampai NIK diisi,
  dan jumlahnya ditampilkan terpisah pada ringkasan kelengkapan.
- Satu keluarga dengan anggota di lebih dari satu kelurahan: tiap orang mengikuti kelurahan
  domisilinya; nomor KK yang sama boleh muncul di lebih dari satu kelurahan dengan peringatan.
- Warga meninggal atau pindah keluar kota pada tahun berjalan: ditandai tidak aktif dengan
  tanggal dan tidak dihitung pada rekapitulasi setelah tanggal itu.
- Warga dengan lebih dari tiga kombinasi kerawanan di satu kelurahan: rekapitulasi 5.A.3
  menampilkan semua variasi yang ada, tidak terbatas pada dua kolom contoh di formulir.
- Petugas yang juga warga kawasan rawan bencana: dihitung pada kedua kelompok sesuai aturan
  formulir, tetapi sekali saja sebagai orang.
- Alamat warga berada di RT/RW yang belum ditetapkan sebagai kawasan rawan: baris ditolak dan
  operator diarahkan meminta penetapan kawasan kepada admin BPBD bila memang rawan.
- Lembar kerja dengan susunan kolom tidak sesuai formulir resmi: ditolak seluruhnya dengan
  penjelasan kolom yang tidak dikenali.
- Unggahan ulang lembar kerja yang sama: tidak menggandakan data; baris yang berubah ditampilkan
  sebagai pembaruan untuk dikonfirmasi.
- Dua operator mengubah baris yang sama bersamaan: perubahan kedua tidak menimpa diam-diam;
  operator diberi tahu dan diminta memuat ulang.
- Tahun anggaran tanpa kejadian bencana: Form 5.A.9 sampai 5.A.12 diekspor kosong dengan
  keterangan "nihil".

## Requirements *(mandatory)*

### Functional Requirements

**Kawasan rawan bencana**

- **FR-026**: Admin BPBD WAJIB dapat menetapkan kawasan rawan bencana per tahun anggaran pada
  tingkat RT/RW di dalam kelurahan beserta jenis bencana yang mengancamnya dan dasar
  penetapannya (Kajian Risiko Bencana atau keputusan BPBD).
- **FR-027**: Sistem WAJIB hanya menerima warga yang alamatnya berada pada kawasan rawan bencana
  yang telah ditetapkan; baris di luar kawasan itu ditolak saat pengisian dan impor dengan
  alasan yang jelas. Jenis kerawanan tempat tinggal warga diisi awal dari jenis bencana
  kawasannya dan dapat dikoreksi per warga.

**Orang dan peran**

- **FR-001**: Sistem WAJIB mencatat setiap orang satu kali berdasarkan NIK 16 digit yang
  tervalidasi, dengan peran (warga kawasan rawan bencana, korban, petugas, aparatur, relawan)
  melekat pada orang yang sama. Orang tanpa NIK WAJIB dapat dicatat dengan penanda "NIK belum
  ada" beserta alasannya, dihitung dalam jumlah jiwa, dan diperiksa kemungkinan gandanya dari
  nama, tanggal lahir, dan nomor KK; saat NIK diisi, catatan itu digabung bila NIK sudah ada.
- **FR-002**: Sistem WAJIB mengaitkan warga dengan kepala keluarganya dan nomor KK sehingga jumlah
  KK dan jiwa dapat dihitung.
- **FR-003**: Sistem WAJIB menentukan kelompok umur rentan dari tanggal lahir terhadap tanggal
  acuan tahun anggaran: balita (di bawah 5 tahun), anak (5 sampai di bawah 18 tahun), lanjut
  usia (60 tahun ke atas). Batas usia WAJIB berupa pengaturan yang dapat diubah admin dan
  tercatat per tahun anggaran; koreksi manual per warga WAJIB disertai alasan.
- **FR-004**: Sistem WAJIB hanya menerima nama kecamatan dan kelurahan dari daftar wilayah resmi.

**Pendataan dan impor**

- **FR-028**: Data yang diisi atau diunggah pendata kelurahan WAJIB berstatus "menunggu
  persetujuan" sampai disetujui atau dikembalikan operator BPBD beserta catatannya; hanya data
  yang disetujui yang dihitung dalam rekapitulasi dan ekspor resmi. Data yang diisi operator
  BPBD langsung berstatus disetujui.
- **FR-005**: Pengguna berwenang WAJIB dapat menambah, mengubah, dan menonaktifkan data warga per
  kelurahan dan per tahun anggaran.
- **FR-006**: Sistem WAJIB menerima unggahan lembar kerja berformat formulir resmi 5.A.1, 5.A.2,
  dan 5.A.5, memvalidasi tiap baris (panjang dan keunikan NIK, wilayah, nilai pilihan, tanggal),
  menampilkan pratinjau hasil, dan baru menyimpan setelah dikonfirmasi.
- **FR-007**: Sistem WAJIB melaporkan setiap baris yang ditolak beserta nomor baris, kolom, dan
  alasannya, serta menyediakan daftar itu untuk diunduh.
- **FR-008**: Sistem WAJIB mencatat sumber setiap data (pendata atau instansi, tanggal, berkas
  asal bila dari unggahan).
- **FR-009**: Sistem WAJIB mencatat jenis kerawanan tempat tinggal tiap warga menurut sepuluh
  jenis bencana pada formulir dan menurunkan kelompok variasi kerawanannya.

**Petugas, kejadian, inventaris**

- **FR-010**: Sistem WAJIB mencatat petugas dengan status, sertifikasi, jenis penugasan, dan
  lokasi penugasan sesuai Form 5.A.5, dan memungkinkan memilih relawan terverifikasi sebagai
  petugas.
- **FR-011**: Sistem WAJIB mencatat kejadian bencana sesuai Form 5.A.12, termasuk waktu kejadian,
  waktu laporan diterima, dan status darurat beserta rentang waktu penetapannya.
- **FR-012**: Sistem WAJIB mencatat warga terdampak per kejadian bencana (Form 5.A.9) dan status
  korban tiap warga terdampak itu (Form 5.A.10), dengan riwayat perubahan status. Form 5.A.10
  hanya memuat orang yang tercatat pada Form 5.A.9 kejadian yang sama.
- **FR-013**: Sistem WAJIB mencatat petugas aktif per kejadian sesuai Form 5.A.11.
- **FR-014**: Sistem WAJIB mencatat peralatan dan stok logistik sesuai Form 5.A.7 dan 5.A.8.

**Rekapitulasi dan keluaran**

- **FR-015**: Sistem WAJIB menghitung Form 5.A.3, 5.A.4, dan 5.A.6 dari data rincian; angka yang
  dapat diturunkan tidak boleh diisi manual.
- **FR-016**: Setiap angka rekapitulasi WAJIB dapat ditelusuri ke baris rincian penyusunnya oleh
  pengguna berwenang.
- **FR-017**: Sistem WAJIB mengekspor setiap Form 5.A.1 sampai 5.A.12 ke berkas spreadsheet dan
  dokumen siap cetak dengan kepala laporan, judul, urutan, dan penomoran kolom formulir resmi.
- **FR-018**: Sistem WAJIB menyediakan ringkasan kelengkapan per kelurahan (sudah didata, jumlah
  baris belum lengkap) agar kemajuan pendataan terlihat.

**Tahun anggaran**

- **FR-019**: Semua data pelaporan WAJIB terikat pada satu tahun anggaran.
- **FR-020**: Admin WAJIB dapat memfinalkan tahun anggaran; data final tidak dapat diubah kecuali
  melalui revisi bernomor yang memuat alasan dan mempertahankan versi sebelumnya.
- **FR-021**: Admin WAJIB dapat membuka tahun anggaran baru dengan menyalin data dasar tahun
  sebelumnya, kecuali data kejadian dan korban.

**Akses dan perlindungan data**

- **FR-029**: Akun pendata kelurahan WAJIB dibuat oleh admin BPBD, terikat pada tepat satu
  kelurahan, dan dapat dinonaktifkan sewaktu-waktu.
- **FR-022**: Daftar perorangan WAJIB hanya dapat dibuka dan diekspor oleh peran BPBD yang
  berwenang; pendata kelurahan hanya dapat melihat dan mengisi kelurahannya sendiri; peran lain
  hanya melihat rekapitulasi.
- **FR-023**: NIK dan nomor KK WAJIB tersamar pada tampilan daftar; nilai utuh hanya tampil pada
  layar rincian dan berkas ekspor resmi bagi peran berwenang.
- **FR-024**: Sistem WAJIB mencatat jejak audit untuk setiap penambahan, perubahan, penonaktifan,
  impor, ekspor, finalisasi, revisi, dan pembukaan data perorangan.
- **FR-025**: Sistem WAJIB menyediakan pencatatan permintaan pembetulan data dari warga yang
  disampaikan melalui BPBD beserta tindak lanjutnya.

### Key Entities *(include if feature involves data)*

- **Tahun Anggaran**: periode pelaporan; berstatus terbuka, final, atau revisi ke-n.
- **Orang**: satu individu dengan NIK, nama, jenis kelamin, tempat dan tanggal lahir; dipakai
  bersama oleh modul relawan.
- **Keluarga**: nomor KK dan kepala keluarga; beranggotakan orang.
- **Data Warga Tahunan**: keadaan seorang warga pada satu tahun anggaran: alamat, kelurahan,
  kondisi ekonomi, kebutuhan khusus dan jenisnya, kelompok umur rentan, status aktif, sumber data.
- **Kerawanan Tempat Tinggal**: jenis bencana yang mengancam tempat tinggal warga pada satu tahun;
  menghasilkan kelompok variasi kerawanan.
- **Petugas**: orang dengan status kepegawaian, sertifikasi, jenis penugasan, lokasi penugasan.
- **Kejadian Bencana**: nama, waktu kejadian, waktu laporan, lokasi, status darurat.
- **Warga Terdampak / Status Korban**: kaitan orang dengan kejadian dan riwayat statusnya.
- **Petugas Aktif**: kaitan petugas dengan kejadian dan lokasi penugasannya.
- **Peralatan** dan **Stok Logistik**: barang, jumlah, lokasi, penanggung jawab, kondisi.
- **Wilayah**: kecamatan dan kelurahan resmi.
- **Kawasan Rawan Bencana**: RT/RW di dalam kelurahan yang ditetapkan rawan pada satu tahun
  anggaran, jenis bencananya, dan dasar penetapannya.
- **Berkas Impor**: unggahan, hasil validasi, dan daftar baris ditolak.
- **Revisi**: nomor, alasan, pembuat, waktu, dan isi perubahan terhadap tahun yang sudah final.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Operator menyelesaikan unggahan dan konfirmasi data satu kelurahan berisi 1.000
  baris dalam waktu kurang dari 10 menit, termasuk meninjau baris yang ditolak.
- **SC-002**: 100% baris yang ditolak saat impor memiliki alasan yang menyebut baris dan kolomnya.
- **SC-003**: Angka pada Form 5.A.3, 5.A.4, dan 5.A.6 sama persis dengan hitungan ulang dari data
  rincian pada setiap pengujian.
- **SC-004**: Tidak ada orang yang tercatat lebih dari satu kali untuk NIK yang sama, dan jumlah
  warga tanpa NIK selalu terlihat pada ringkasan kelengkapan tiap kelurahan.
- **SC-005**: Berkas ekspor tiap formulir 5.A diterima tanpa perbaikan susunan kolom saat
  dibandingkan dengan formulir resmi.
- **SC-006**: Rekapitulasi seluruh kota tampil dalam waktu kurang dari 5 detik dengan 200.000
  jiwa tercatat.
- **SC-007**: Waktu penyusunan rekapitulasi tahunan 5.A turun dari hitungan hari menjadi kurang
  dari satu jam setelah data rincian lengkap.
- **SC-008**: 100% pembukaan dan ekspor daftar perorangan tercatat di jejak audit, dan tidak ada
  peran di luar yang berwenang yang dapat membukanya.

## Assumptions

- Format formulir mengikuti berkas kerja BPBD tahun anggaran 2026 yang merujuk Permendagri No.
  101 Tahun 2018; bila format resmi berubah, susunan kolom diperbarui sebagai data rujukan.
- Form 5.A.9 adalah daftar warga terdampak/korban per kejadian bencana (terkonfirmasi); judul
  resminya tetap dicocokkan dengan lampiran peraturan saat menyusun templat ekspor.
- Hanya warga di kawasan yang ditetapkan rawan bencana yang dicatat (terkonfirmasi). Jumlahnya
  belum diketahui; rancangan diuji hingga 200.000 jiwa sebagai batas atas perkiraan. Asumsi
  skala 2.000 orang pada fitur relawan tidak berlaku untuk fitur ini.
- Pengisian dilakukan pendata kelurahan dan operator BPBD dengan persetujuan operator BPBD
  (terkonfirmasi). Warga tidak mengisi data sendiri.
- Kelompok umur rentan: balita, anak, dan lanjut usia dengan batas pada FR-003 (terkonfirmasi).
  Tanggal acuan perhitungan usia adalah 31 Desember tahun anggaran.
- Kondisi ekonomi (miskin/tidak miskin) diisi berdasarkan data yang dibawa pendata; integrasi
  dengan data kesejahteraan sosial berada di luar lingkup.
- Dasar pemrosesan data warga adalah pelaksanaan kewenangan BPBD sesuai konstitusi proyek;
  kepastian hukumnya dikonfirmasi bagian hukum sebelum data nyata dimasukkan.
- Data tahun sebelumnya yang sudah ada dalam bentuk lembar kerja dimasukkan lewat fitur impor
  yang sama; tidak ada migrasi khusus.
- Integrasi dengan data kependudukan (Disdukcapil) untuk verifikasi NIK berada di luar lingkup.
- Form 5.B sampai 5.E (perhitungan kebutuhan, rencana pemenuhan, realisasi, kinerja) berada di
  luar lingkup dan menjadi fitur berikutnya yang memakai data fitur ini.
- Bergantung pada fitur `001-basis-data-relawan` untuk akun pengguna, peran, jejak audit, daftar
  wilayah, dan data relawan terverifikasi.
