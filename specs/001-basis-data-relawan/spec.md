# Feature Specification: Basis Data Relawan e-Tangguh (MVP)

**Feature Branch**: `claude/affectionate-edison-hu6uwc` | **Created**: 2026-11-10 | **Status**: Draft

**Input**: "Aplikasi untuk basis data relawan kebencanaan yang memudahkan BPBD Kota Banjarmasin
untuk manajemen data relawan. Aplikasi ini menyediakan berbagai kemudahan juga bagi relawan.
Data relawan dapat disajikan secara visual yang bagus mirip memilih pemain di game."

> Catatan: spesifikasi ini disusun saat `/speckit-plan` karena belum ada `spec.md`. Isinya
> turunan dari masukan pengguna ditambah asumsi yang ditandai. Jalankan `/speckit-clarify`
> untuk mengonfirmasi asumsi sebelum implementasi.

## Clarifications

### Session 2026-11-10

- Q: Di mana aplikasi dan datanya akan di-hosting? → A: Server milik/ditunjuk Pemko Banjarmasin (Diskominfo) di Indonesia.
- Q: Dengan cara apa pengguna masuk pada versi pertama? → A: Email atau nomor ponsel + kata sandi; pemulihan lewat email atau admin.
- Q: Berapa lama data relawan nonaktif disimpan sebelum dianonimkan? → A: Mengikuti Jadwal Retensi Arsip Pemko/BPBD; pengaturan yang dapat diubah super admin, bawaan 5 tahun sampai angka resmi tersedia.
- Q: Berapa usia minimum relawan? → A: 15 tahun; pendaftar berusia 15 sampai di bawah 18 tahun wajib menyertakan izin orang tua/wali.
- Q: Apakah daftar awal 10 klaster keahlian dapat dipakai? → A: Ya, sebagai data awal yang dapat diubah super admin.
- Q: Berapa jumlah relawan yang akan tercatat dalam 3 tahun pertama? → A: Sampai 2.000 relawan (binaan BPBD dan organisasi terdaftar), sekitar 50 pengguna bersamaan.

## Peran

| Peran | Uraian |
|---|---|
| Publik (anonim) | Melihat statistik agregat dan halaman pendaftaran |
| Relawan | Mengelola profil, bukti kompetensi, ketersediaan, dan persetujuan datanya sendiri |
| Pengurus organisasi | Mengelola keanggotaan organisasinya dan melihat anggota organisasinya |
| Admin BPBD | Memverifikasi, mencari, menyusun tim, mengekspor |
| Super admin | Mengelola pengguna, data rujukan, rumus atribut, melihat jejak audit |

## User Scenarios & Testing

### US1 - Pendaftaran dan profil relawan (P1)

Relawan mendaftar mandiri, memberi persetujuan pemrosesan data, melengkapi profil (identitas,
domisili, klaster keahlian, kontak darurat, data kesehatan opsional), mengunggah bukti
(sertifikat, pelatihan), lalu mengajukan verifikasi.

**Independent Test**: satu relawan dapat mendaftar hingga berstatus "diajukan" tanpa bantuan
admin.

1. **Given** pengunjung belum punya akun, **When** mendaftar dan menyetujui pernyataan
   persetujuan, **Then** akun dibuat, persetujuan tercatat (waktu, versi), profil berstatus draf.
2. **Given** NIK sudah terdaftar, **When** didaftarkan lagi, **Then** ditolak tanpa membocorkan
   milik siapa NIK tersebut.
3. **Given** profil draf lengkap, **When** diajukan, **Then** status menjadi "diajukan" dan masuk
   antrean admin.
4. **Given** relawan terverifikasi, **When** menarik persetujuan atau meminta penghapusan,
   **Then** permintaan tercatat dan data tidak lagi muncul di pencarian.

### US2 - Verifikasi oleh admin BPBD (P1)

Admin meninjau antrean, membuka data dan dokumen, lalu memverifikasi atau menolak dengan alasan;
hal yang sama berlaku per bukti kompetensi.

**Independent Test**: admin mengubah satu profil "diajukan" menjadi "terverifikasi" dan satu lagi
"ditolak" beserta alasan yang terlihat oleh relawan.

1. **Given** profil diajukan, **When** admin memverifikasi, **Then** status berubah, atribut
   dihitung, dan tindakan tercatat di jejak audit.
2. **Given** bukti ditolak, **Then** bukti itu tidak ikut dihitung dalam atribut.

### US3 - Galeri kartu relawan dan penyusunan tim (P1)

Admin menelusuri relawan terverifikasi sebagai kartu (foto, klaster keahlian utama, nilai
keseluruhan, enam atribut, status ketersediaan), memfilter cepat, membuka detail dengan diagram
radar, membandingkan hingga tiga relawan, dan memasukkan relawan ke sebuah tim.

**Independent Test**: admin menemukan relawan klaster "Medis" di satu kecamatan yang berstatus
siaga dalam ≤ 3 interaksi, lalu menyimpan tim berisi lima relawan.

1. **Given** galeri kartu, **When** beralih ke tampilan tabel, **Then** informasi yang sama
   tersedia.
2. **Given** detail relawan, **When** admin membuka "dasar perhitungan", **Then** setiap nilai
   atribut dirinci ke bukti penyusunnya.
3. **Given** tim disusun, **Then** ringkasan komposisi klaster keahlian dan daftar kontak tim
   tersedia dan dapat diekspor.

### US4 - Organisasi relawan (P2)

Pengurus mengelola profil organisasi dan menyetujui keanggotaan; relawan dapat tergabung pada
lebih dari satu organisasi.

### US5 - Peta sebaran (P2)

Admin melihat sebaran relawan per kecamatan/kelurahan dan mencari relawan terdekat dari sebuah
titik. Publik hanya melihat agregat per wilayah.

### US6 - Dasbor, ekspor, dan jejak audit (P2)

Admin melihat statistik (jumlah, per klaster, per wilayah, status verifikasi) dan mengekspor
CSV/XLSX/PDF. Super admin menelusuri jejak audit.

### US7 - Ketersediaan relawan (P3)

Relawan mengatur status ketersediaan (siaga, terbatas, tidak tersedia) yang tampil pada kartu.

### Edge Cases

- Relawan tanpa bukti kompetensi: kartu tampil dengan atribut terkait bernilai minimum, bukan
  kosong.
- Sertifikat kedaluwarsa: tidak dihitung sejak tanggal kedaluwarsa.
- Pendaftar di bawah 15 tahun: pendaftaran ditolak.
- Pendaftar berusia 15 sampai di bawah 18 tahun tanpa dokumen izin orang tua/wali: profil tidak
  dapat diajukan untuk verifikasi.
- Relawan muda yang mencapai usia 18 tahun: penanda "relawan muda" hilang dan relawan diminta
  memberi persetujuan atas namanya sendiri.
- Domisili di luar Kota Banjarmasin: boleh mendaftar, ditandai "luar kota".
- Unggahan bukan gambar/PDF atau melebihi batas ukuran: ditolak dengan pesan jelas.

## Requirements

- **FR-001**: Sistem WAJIB menyediakan pendaftaran mandiri dengan persetujuan eksplisit berversi.
- **FR-017**: Sistem WAJIB menyediakan masuk dengan email atau nomor ponsel + kata sandi serta
  pemulihan kata sandi lewat email atau pengaturan ulang oleh admin (tercatat di jejak audit).
- **FR-018**: Sistem WAJIB menolak pendaftar berusia di bawah 15 tahun. Untuk pendaftar berusia 15
  sampai di bawah 18 tahun, sistem WAJIB meminta nama dan kontak orang tua/wali serta unggahan
  dokumen izin, yang diverifikasi admin sebelum profil dapat berstatus terverifikasi, dan WAJIB
  menampilkan penanda teks "relawan muda" pada kartu dan detail. Usia DILARANG memengaruhi nilai
  atribut.
- **FR-002**: Sistem WAJIB mencegah duplikasi relawan berdasarkan NIK tervalidasi (16 digit).
- **FR-003**: Sistem WAJIB menyimpan NIK, data kesehatan, kontak darurat, dan alamat rinci
  terenkripsi dan menyamarkan NIK di semua tampilan selain layar verifikasi admin.
- **FR-004**: Sistem WAJIB memiliki status verifikasi profil dan bukti: draf, diajukan,
  terverifikasi, ditolak.
- **FR-005**: Sistem WAJIB menghitung enam atribut dan nilai keseluruhan (skala 1-99) hanya dari
  bukti terverifikasi dengan rumus berversi yang terdokumentasi.
- **FR-006**: Sistem WAJIB menampilkan rincian dasar perhitungan atribut kepada relawan pemilik
  dan admin, serta menerima pengajuan koreksi.
- **FR-007**: Sistem WAJIB menyediakan galeri kartu dan tampilan tabel yang setara, dengan filter
  klaster keahlian, wilayah, ketersediaan, organisasi, dan rentang atribut.
- **FR-008**: Sistem WAJIB menyediakan perbandingan hingga tiga relawan.
- **FR-009**: Sistem WAJIB memungkinkan admin menyusun, menyimpan, dan mengekspor tim.
- **FR-010**: Sistem WAJIB menegakkan kontrol akses per peran di server, default ditolak.
- **FR-011**: Sistem WAJIB mencatat jejak audit untuk buat/ubah/hapus/verifikasi/ekspor/buka data
  sensitif.
- **FR-012**: Sistem WAJIB menyediakan peta agregat per wilayah; titik perorangan hanya untuk
  admin BPBD.
- **FR-013**: Sistem WAJIB menyediakan ekspor CSV/XLSX/PDF bagi peran berwenang.
- **FR-014**: Sistem WAJIB memproses penarikan persetujuan dan permintaan penghapusan, serta
  menganonimkan relawan nonaktif setelah masa simpan. Masa simpan WAJIB berupa pengaturan yang
  hanya dapat diubah super admin (bawaan 5 tahun), dan setiap perubahannya tercatat di jejak
  audit.
- **FR-015**: Sistem WAJIB mengelola organisasi relawan dan keanggotaannya.
- **FR-016**: Antarmuka WAJIB berbahasa Indonesia, mobile-first, memenuhi WCAG 2.1 AA.

## Key Entities

Pengguna, Relawan, Persetujuan, Klaster Keahlian, Bukti Kompetensi (sertifikat/pelatihan),
Penugasan, Organisasi, Keanggotaan, Wilayah (kecamatan/kelurahan), Atribut Relawan, Versi Rumus,
Tim, Jejak Audit. Rinci di `data-model.md`.

## Success Criteria

- **SC-001**: Relawan menyelesaikan pendaftaran hingga "diajukan" dalam ≤ 10 menit di ponsel.
- **SC-002**: Admin menemukan relawan sesuai klaster, wilayah, dan ketersediaan dalam ≤ 30 detik.
- **SC-003**: Hasil pencarian tampil ≤ 3 detik pada profil jaringan "Slow 4G" dengan 2.000
  relawan tercatat dan 50 pengguna bersamaan.
- **SC-004**: 100% tindakan pada FR-011 muncul di jejak audit (dibuktikan uji otomatis).
- **SC-005**: Tidak ada NIK utuh atau data kesehatan pada respons API untuk peran yang tidak
  berwenang (dibuktikan uji otomatis).
- **SC-006**: Nol pelanggaran aksesibilitas tingkat "serious/critical" pada pemindaian otomatis.

## Assumptions (perlu konfirmasi BPBD)

- **A1** (terkonfirmasi): Skala ≤ 2.000 relawan (binaan BPBD dan organisasi terdaftar), ≤ 50
  pengguna bersamaan, dalam 3 tahun pertama.
- **A2** (terkonfirmasi): Masa simpan data relawan nonaktif mengikuti Jadwal Retensi Arsip
  Pemko/BPBD. Nilainya berupa pengaturan yang dapat diubah super admin, bawaan 5 tahun sampai
  angka resmi tersedia; setelah lewat, data dianonimkan.
- **A3** (terkonfirmasi): Usia minimum relawan 15 tahun; usia 15 sampai di bawah 18 tahun wajib
  dengan izin orang tua/wali.
- **A4** (terkonfirmasi): Daftar klaster keahlian awal: SAR dan Evakuasi, Medis/Kesehatan, Dapur Umum, Logistik,
  Kaji Cepat, Komunikasi dan Informasi, Dukungan Psikososial, Air Bersih dan Sanitasi, Hunian
  Darurat, Pemadam Kebakaran. Dapat diubah super admin.
- **A5** (terkonfirmasi): Masuk dengan email atau nomor ponsel + kata sandi; lupa kata sandi
  dipulihkan lewat email atau oleh admin. OTP dan SSO pemerintah di luar MVP.
- **A6** (terkonfirmasi): Hosting pada server milik/ditunjuk Pemko Banjarmasin (Diskominfo) di
  Indonesia.

## Out of Scope (fitur berikutnya)

Mobilisasi dan notifikasi kejadian bencana, kartu tanda relawan digital ber-QR, pengingat masa
berlaku sertifikat, integrasi WhatsApp/SMS, SSO, aplikasi native.
