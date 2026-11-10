# Research: Basis Data Relawan e-Tangguh (MVP)

Keputusan di bawah berasal dari pengetahuan umum penyusun, bukan dari uji coba pada proyek ini.
Nomor versi sengaja tidak dikunci; pakai rilis stabil/LTS terbaru saat implementasi dan catat di
lockfile.

## R1. Lapisan server/API (menyelesaikan TODO(BACKEND_STACK))

- **Decision** (ditetapkan pemilik proyek): API REST dengan NestJS (TypeScript, Node.js LTS).
  Otorisasi lewat guard global (`SessionGuard`, `RolesGuard` dengan dekorator `@Roles`; rute
  tanpa dekorator ditolak). Jejak audit lewat interceptor ber-dekorator `@Audit` yang menulis
  dalam transaksi yang sama. Validasi lewat pipe Zod memakai skema di `packages/shared`.
  Akses basis data dengan Drizzle ORM dan SQL mentah untuk kueri PostGIS. Dokumen OpenAPI
  dihasilkan dari kode.
- **Rationale**: satu bahasa untuk antarmuka dan server; struktur modul, guard, dan interceptor
  NestJS memaksa pola seragam untuk kontrol akses dan audit (Prinsip II) dan memudahkan serah
  terima ke pengembang lain; dapat dijalankan di VM pemerintah dengan Docker Compose.
- **Keputusan turunan**:
  - Validasi memakai Zod, bukan `class-validator`, agar skema dan rumus atribut tetap satu
    sumber dengan antarmuka React.
  - Drizzle, bukan Prisma/TypeORM: Prisma tidak memiliki tipe PostGIS bawaan; kueri spasial
    tetap ditulis sebagai SQL dan diuji terhadap PostGIS sungguhan.
  - Adaptor HTTP bawaan NestJS dipakai; tidak ada alasan kinerja pada skala A1 untuk menggantinya.
- **Alternatives considered**:
  - Fastify tanpa kerangka: lebih ringan, tetapi konvensi akses dan audit harus dibangun sendiri.
  - Supabase terkelola: tercepat dibangun, tetapi wilayah layanan terdekat berada di luar
    Indonesia sehingga berisiko terhadap ketentuan penempatan data instansi publik.
  - Supabase self-hosted: banyak layanan yang harus dioperasikan tim kecil (Prinsip VI).
  - Laravel/PHP: memecah bahasa dengan antarmuka React dan menduplikasi skema serta rumus.

## R2. Autentikasi dan sesi

- **Decision**: sesi berbasis cookie `httpOnly`, `Secure`, `SameSite=Lax`, disimpan di
  PostgreSQL; kata sandi di-hash dengan Argon2id; proteksi CSRF untuk permintaan yang mengubah
  data; pembatasan laju pada login dan pendaftaran.
- **Rationale**: token tidak tersimpan di JavaScript peramban; sesi dapat dicabut seketika; tidak
  perlu layanan tambahan.
- **Alternatives considered**: JWT di localStorage (rentan XSS, sulit dicabut); penyedia identitas
  eksternal (ketergantungan dan penempatan data); OTP WhatsApp/SMS (biaya dan integrasi, ditunda).

## R3. Enkripsi data sensitif

- **Decision**: enkripsi tingkat kolom di aplikasi dengan AES-256-GCM untuk NIK, data kesehatan,
  kontak darurat, alamat rinci; kunci dari variabel lingkungan/secret manager dengan pengenal
  versi kunci per baris agar dapat dirotasi. Keunikan NIK memakai indeks buta HMAC-SHA-256
  dengan kunci terpisah. TLS untuk transit; enkripsi disk pada volume basis data dan berkas.
- **Rationale**: cadangan dan akses langsung ke basis data tidak membuka NIK; pencarian duplikat
  tetap mungkin tanpa menyimpan NIK polos.
- **Alternatives considered**: `pgcrypto` (kunci ikut terkirim dalam kueri dan dapat masuk log);
  hanya enkripsi disk (tidak melindungi dari dump basis data).

## R4. Penyimpanan berkas (foto, sertifikat)

- **Decision**: volume berkas lokal di server di balik antarmuka penyimpanan; berkas hanya
  disajikan lewat API setelah otorisasi; nama berkas acak; pemeriksaan tipe dari isi berkas; batas
  5 MB; hanya JPEG/PNG/WebP/PDF. Foto profil dibuatkan turunan berukuran kecil.
- **Rationale**: paling sederhana untuk dioperasikan; antarmuka memungkinkan pindah ke
  penyimpanan objek kompatibel-S3 tanpa mengubah fitur.
- **Alternatives considered**: penyimpanan objek sejak awal (layanan tambahan); menyimpan berkas
  di basis data (membengkakkan cadangan).

## R5. Ubin dan gaya peta untuk MapLibre

- **Decision**: ubin vektor satu berkas PMTiles hasil ekstrak OpenStreetMap wilayah Kota
  Banjarmasin dan sekitarnya, di-host sendiri sebagai berkas statis; gaya peta sumber terbuka
  yang disesuaikan; atribusi OpenStreetMap ditampilkan. MapLibre dimuat malas hanya pada rute
  peta.
- **Rationale**: tidak bergantung pada penyedia ubin pihak ketiga saat darurat; tidak ada data
  pengguna yang terkirim ke luar; lisensi ODbL mengizinkan pemakaian dengan atribusi.
- **Alternatives considered**: penyedia ubin komersial (biaya, ketergantungan, kebocoran metadata
  penggunaan); server ubin publik OSM (tidak untuk pemakaian produksi); server ubin dinamis
  sendiri (lebih berat dioperasikan).
- **Perlu verifikasi**: sumber dan lisensi batas kecamatan/kelurahan resmi (BIG/BPS/Pemko);
  jumlah wilayah (dipahami 5 kecamatan dan 52 kelurahan) dicek terhadap data resmi terkini.

## R6. Model lokasi relawan

- **Decision**: domisili wajib berupa rujukan kelurahan; titik koordinat opsional dengan
  persetujuan terpisah, disimpan `geography(Point, 4326)`. Agregat publik dihitung per kelurahan
  dan disembunyikan bila jumlahnya < 5. Pencarian terdekat memakai `ST_DWithin`/operator KNN
  dengan indeks GiST dan hanya untuk admin BPBD.
- **Rationale**: minimisasi data; agregat kecil dapat mengidentifikasi orang.
- **Alternatives considered**: geokode alamat otomatis (mengirim alamat ke pihak ketiga).

## R7. Rumus atribut kartu relawan

- **Decision**: enam atribut skala 1-99 dihitung fungsi murni di paket bersama, disimpan sebagai
  snapshot beserta versi rumus dan rincian penyusunnya; dihitung ulang saat bukti berubah status
  dan terjadwal harian (untuk kedaluwarsa). Bobot disimpan sebagai data berversi. Rinci di
  `contracts/attribute-formula.md`.
- **Rationale**: deterministik, dapat diuji, dapat dijelaskan (Prinsip III); snapshot membuat
  pencarian dan pengurutan cepat.
- **Alternatives considered**: penilaian manual oleh admin (subjektif, melanggar Prinsip III);
  menghitung saat kueri (lambat dan sulit diaudit).

## R8. Antarmuka

- **Decision**: React + Vite + TypeScript, React Router, TanStack Query, Tailwind CSS, primitif
  aksesibel (Radix UI). Diagram radar digambar dengan SVG sendiri disertai tabel nilai. Aplikasi
  dapat dipasang (PWA) dengan cache hanya untuk kerangka aplikasi dan aset statis.
- **Rationale**: pustaka grafik penuh tidak diperlukan untuk satu jenis diagram; cache data
  pribadi di perangkat dihindari (Prinsip I).
- **Alternatives considered**: pustaka grafik (menambah ukuran bundel); cache data offline
  (risiko kebocoran pada perangkat hilang). Kebutuhan luring dipenuhi dengan ekspor "daftar
  siaga" oleh admin (Prinsip V).

## R9. Jejak audit yang tidak dapat diubah

- **Decision**: tabel `audit_log` hanya-tambah; peran basis data milik aplikasi hanya diberi
  `INSERT` dan `SELECT` pada tabel itu; pemicu menolak `UPDATE`/`DELETE`; entri ditulis dalam
  transaksi yang sama dengan perubahan datanya.
- **Alternatives considered**: log berkas (mudah hilang, sulit ditelusuri); layanan log eksternal
  (ketergantungan).

## R10. Pengujian dan CI

- **Decision**: Vitest untuk unit (rumus atribut, kebijakan akses); uji integrasi API terhadap
  PostgreSQL/PostGIS sungguhan dalam kontainer; Playwright untuk alur ujung-ke-ujung dan
  pemindaian aksesibilitas (axe); pemeriksaan anggaran ukuran bundel; semuanya di GitHub Actions.
- **Rationale**: kueri spasial dan hak akses basis data tidak bermakna bila di-mock.

## R11. Penerapan, cadangan, pemulihan

- **Decision**: Docker Compose (reverse proxy TLS, API, berkas statis antarmuka, PostgreSQL +
  PostGIS); cadangan harian `pg_dump` dan arsip volume berkas, terenkripsi, disalin ke lokasi
  kedua; uji pemulihan terdokumentasi sebelum rilis produksi.
- **Alternatives considered**: Kubernetes (berlebihan untuk skala A1); PaaS luar negeri
  (penempatan data).
- **Perlu verifikasi**: lokasi hosting dan ketentuan penempatan data oleh Diskominfo.

## Sisa ketidakpastian (bukan penghalang rencana)

Asumsi A1-A6 pada `spec.md`, sumber batas wilayah resmi, dan lokasi hosting memerlukan konfirmasi
BPBD/Diskominfo. Tidak ada NEEDS CLARIFICATION teknis yang tersisa.
