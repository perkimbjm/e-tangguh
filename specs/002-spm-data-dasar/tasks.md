# Tasks: Data Dasar SPM Sub-Urusan Bencana (Form 5.A)

**Input**: Design documents from `/specs/002-spm-data-dasar/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (api.md, forms.md, import.md), quickstart.md

**Tests**: Disertakan. Konstitusi (Prinsip VI) mewajibkan uji otomatis untuk kontrol akses, alur
verifikasi, dan perhitungan; plan.md mewajibkan uji integrasi, berkas emas, dan beban.

**Organization**: Tugas dikelompokkan per user story agar tiap story dapat dikerjakan dan diuji
sendiri. Repositori belum berisi kode, sehingga Phase 1 dan Phase 2 juga membangun fondasi yang
pada plan.md disebut berasal dari fitur `001-basis-data-relawan` (autentikasi, peran, audit,
wilayah, berkas). Rujukan "001/" berarti `specs/001-basis-data-relawan/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: dapat dikerjakan paralel (berkas berbeda, tanpa ketergantungan pada tugas yang belum selesai)
- **[Story]**: user story yang dilayani (US1-US6)

## Aturan yang berlaku untuk SEMUA tugas

- **Batas 400 baris per berkas kode** (konstitusi v1.3.0, Prinsip VI). Bila sebuah berkas akan
  melampaui 400 baris, pecah menurut tanggung jawab sebelum menambah isi: satu tabel per berkas
  skema, satu controller per sumber daya, layanan dipecah menjadi `*.service.ts` (orkestrasi),
  `*.repository.ts` (kueri), `*.mapper.ts` (bentuk data), dan komponen React dipecah menjadi
  komponen anak serta hook. Tugas di bawah sudah dipecah mengikuti aturan ini; T004 memasang
  pemeriksaan otomatisnya.
- Skema permintaan/respons didefinisikan sekali dengan Zod di `packages/shared` dan dipakai
  server serta antarmuka.
- Setiap titik akhir memakai `@Roles(...)` dan, bila kontraknya bertanda "Audit: ya", `@Audit(...)`.
- Kolom bertanda 🔒 di data-model.md ditulis dan dibaca hanya lewat `FieldCipher`.
- Data uji seluruhnya sintetis. Berkas kerja nyata DILARANG masuk repositori.
- Pesan galat dan teks antarmuka berbahasa Indonesia.

## Path Conventions

Monorepo pnpm: `apps/api` (NestJS), `apps/web` (React + Vite), `packages/shared`, `infra/`,
`tools/`. Skema Drizzle di `apps/api/src/db/schema/`, satu berkas per tabel.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: inisialisasi proyek dan perkakas

- [X] T001 Buat monorepo pnpm: `package.json`, `pnpm-workspace.yaml` (apps/*, packages/*, tools/*), `tsconfig.base.json` (strict), `.nvmrc` (Node LTS), `.editorconfig` di akar repositori
- [X] T002 [P] Inisialisasi API NestJS di `apps/api` (`package.json`, `tsconfig.json`, `nest-cli.json`, `src/main.ts`, `src/app.module.ts`) dengan prefiks global `/api/v1`
- [X] T003 [P] Inisialisasi antarmuka React + Vite + TypeScript di `apps/web` (`package.json`, `vite.config.ts`, `index.html`, `src/main.tsx`) dengan Tailwind CSS, React Router, TanStack Query; proxy `/api` ke port 3000
- [X] T004 Pasang ESLint + Prettier di `eslint.config.js` akar dengan aturan `max-lines: ["error", { max: 400, skipBlankLines: true, skipComments: true }]` untuk seluruh `*.ts`/`*.tsx` (kecuali `apps/api/src/db/migrations/**`), serta skrip `pnpm lint`
- [X] T005 [P] Inisialisasi paket bersama `packages/shared` (`package.json`, `tsconfig.json`, `src/index.ts`) dengan Zod sebagai dependensi
- [X] T006 [P] Buat `infra/docker-compose.yml` dengan layanan `db` (image PostgreSQL + PostGIS) dan `infra/db/init.sql` yang menjalankan `CREATE EXTENSION IF NOT EXISTS postgis; CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS citext;`
- [X] T007 [P] Buat `.env.example` (DATABASE_URL, SESSION_SECRET, FIELD_ENC_KEY, FIELD_ENC_KEY_VERSION, BLIND_INDEX_KEY, FILE_STORAGE_DIR) dan `apps/api/src/config/env.ts` yang memvalidasi variabel dengan Zod dan menggagalkan start bila tidak sah
- [X] T008 [P] Pasang Vitest di `apps/api/vitest.config.ts`, `packages/shared/vitest.config.ts`, dan Playwright di `apps/web/playwright.config.ts`; tambah skrip `test`, `test:integration`, `test:e2e` di `package.json` akar
- [X] T009 [P] Buat alur CI di `.github/workflows/ci.yml`: `pnpm lint`, `pnpm test`, `pnpm test:integration` dengan layanan PostGIS, dan build kedua aplikasi

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: infrastruktur inti yang WAJIB selesai sebelum user story mana pun

**⚠️ CRITICAL**: tidak ada pekerjaan user story sebelum fase ini selesai

### Basis data dan utilitas inti

- [X] T010 Siapkan Drizzle: `apps/api/drizzle.config.ts`, `apps/api/src/db/client.ts` (pool + helper transaksi), `apps/api/src/db/schema/index.ts` (re-ekspor), skrip `db:generate`, `db:migrate`
- [X] T011 [P] Implementasikan `FieldCipher` (AES-256-GCM, keluaran `versi kunci | iv | tag | ciphertext`) di `apps/api/src/crypto/field-cipher.ts` dan uji unit di `apps/api/src/crypto/field-cipher.spec.ts`
- [X] T012 [P] Implementasikan `BlindIndex` (HMAC-SHA-256 atas nilai ternormalisasi, kunci terpisah) di `apps/api/src/crypto/blind-index.ts` dengan uji unit di `apps/api/src/crypto/blind-index.spec.ts`
- [X] T013 [P] Buat filter galat global di `apps/api/src/common/filters/api-exception.filter.ts` dengan bentuk `{ error: { code, message, fields } }` sesuai 001/contracts/api.md, termasuk status 423 untuk tahun final dan 409 untuk `row_version` usang
- [X] T014 [P] Buat `ZodValidationPipe` di `apps/api/src/common/pipes/zod-validation.pipe.ts` yang memetakan galat Zod ke `fields`

### Pengguna, sesi, peran, audit

- [X] T015 Buat skema `users` di `apps/api/src/db/schema/users.ts`: `email citext unik nullable`, `phone text unik nullable` (minimal salah satu terisi), `password_hash`, `role` enum `relawan | pengurus | pendata_kelurahan | operator_bpbd | admin_bpbd | super_admin` (default `relawan`), `kelurahan_id uuid nullable` (wajib bila `role = pendata_kelurahan`), `is_active`, `last_login_at`
- [X] T016 [P] Buat skema `sessions` di `apps/api/src/db/schema/sessions.ts`: token acak disimpan sebagai hash, `user_id`, `expires_at`, `ip`, `user_agent`
- [X] T017 [P] Buat skema `regions` di `apps/api/src/db/schema/regions.ts`: `code`, `name`, `level` enum `kecamatan | kelurahan`, `parent_id`, `geom geometry(MultiPolygon,4326) nullable`; indeks GiST pada `geom` dan indeks trigram pada `name`
- [X] T018 [P] Buat skema `files` di `apps/api/src/db/schema/files.ts`: `owner_user_id`, `kind` enum `foto | bukti | izin_wali | impor | arsip | dokumen`, `mime`, `size`, `storage_key`, `sha256`
- [X] T019 [P] Buat skema `audit_log` di `apps/api/src/db/schema/audit-log.ts`: `id bigserial`, `at`, `actor_user_id`, `actor_role`, `action`, `entity`, `entity_id`, `ip`, `user_agent`, `detail jsonb`; tanpa `updated_at`
- [X] T020 [P] Buat skema `app_settings` di `apps/api/src/db/schema/app-settings.ts`: `key unik`, `value jsonb`, `updated_by`
- [X] T021 Buat migrasi awal untuk T015-T020 di `apps/api/src/db/migrations/` dan migrasi SQL `apps/api/src/db/migrations/0001_audit_immutable.sql` yang memasang pemicu penolak `UPDATE`/`DELETE` pada `audit_log`
- [X] T022 Implementasikan modul autentikasi di `apps/api/src/modules/auth/` (`auth.module.ts`, `auth.controller.ts`, `auth.service.ts`, `session.repository.ts`, `password.ts` dengan Argon2id): `POST /auth/login` (laju dibatasi), `POST /auth/logout`, `GET /auth/me`; cookie `httpOnly`, `Secure`, `SameSite=Lax`; token CSRF untuk metode pengubah
- [X] T023 Buat `SessionGuard` global di `apps/api/src/common/guards/session.guard.ts` dan `RolesGuard` di `apps/api/src/common/guards/roles.guard.ts` dengan dekorator `@Roles` dan `@Public` di `apps/api/src/common/decorators/roles.decorator.ts`; rute tanpa dekorator DITOLAK (403)
- [X] T024 Buat `KelurahanScope` di `apps/api/src/common/guards/kelurahan-scope.ts`: helper yang mengembalikan `kelurahan_id` wajib untuk `pendata_kelurahan` dan melempar 403 bila permintaan menyebut kelurahan lain; dipakai setiap repository yang memuat data warga
- [X] T025 Implementasikan audit di `apps/api/src/modules/audit/` (`audit.module.ts`, `audit.service.ts` yang menulis dalam transaksi berjalan, `audit.interceptor.ts`, dekorator `@Audit(action, entity)` di `audit.decorator.ts`); `detail` DILARANG memuat NIK, KK, alamat, atau data kesehatan
- [X] T026 [P] Implementasikan penyimpanan berkas di `apps/api/src/modules/files/` (`storage.interface.ts`, `local-storage.ts`, `files.service.ts`, `files.controller.ts`): nama acak, pemeriksaan tipe dari isi, unduh hanya setelah otorisasi
- [X] T027 [P] Implementasikan modul wilayah di `apps/api/src/modules/regions/` (`regions.controller.ts`, `regions.repository.ts`): daftar kecamatan/kelurahan dan fungsi `matchByName(name, level)` berbasis `similarity()` `pg_trgm` yang mengembalikan kandidat beserta skor
- [X] T028 [P] Implementasikan administrasi pengguna di `apps/api/src/modules/users/` (`users.controller.ts`, `users.service.ts`): super_admin dan admin_bpbd membuat/menonaktifkan akun; akun `pendata_kelurahan` wajib tepat satu `kelurahan_id` (FR-029)

### Orang, tahun anggaran, rujukan SPM

- [X] T029 Buat skema `persons` di `apps/api/src/db/schema/persons.ts`: `nik_enc bytea nullable`, `nik_hash bytea unik bila terisi`, `nik_last4 char(4) nullable`, `no_nik_reason text nullable`, `full_name text wajib` (indeks trigram), `gender` enum `L | P`, `birth_place`, `birth_date date nullable` (tidak di masa depan), `merged_into_id`; CHECK: tepat satu dari `nik_hash` atau `no_nik_reason` terisi
- [X] T030 [P] Buat skema `families` di `apps/api/src/db/schema/families.ts`: `kk_enc bytea`, `kk_hash bytea unik`, `kk_last4`, `head_person_id → persons`
- [X] T031 [P] Buat skema `fiscal_years` di `apps/api/src/db/schema/fiscal-years.ts`: `year smallint unik`, `status` enum `terbuka | final | revisi`, `revision_no smallint` (0 saat final pertama), `age_reference_date date` (bawaan 31 Desember tahun itu), `age_bands jsonb` (bawaan balita < 5, anak 5-<18, lansia ≥ 60), `copied_from_id`, `finalized_at`, `finalized_by`
- [X] T032 [P] Buat skema `hazard_types` di `apps/api/src/db/schema/hazard-types.ts`: `code`, `name`, `bit` (0-9), `form_order`
- [X] T033 [P] Buat skema `form_definitions` di `apps/api/src/db/schema/form-definitions.ts`: `form_code`, `version`, `regulation_ref`, `title`, `layout jsonb`, `effective_from`
- [X] T034 Buat migrasi untuk T029-T033 dan fungsi SQL `spm_assert_year_writable(fiscal_year_id)` di `apps/api/src/db/migrations/0002_spm_year_lock.sql` yang melempar galat bila tahun berstatus `final`; fungsi ini dipasang sebagai pemicu pada setiap tabel ber-`fiscal_year_id` di migrasi story terkait
- [X] T035 Implementasikan modul orang di `apps/api/src/modules/persons/` (`persons.module.ts`, `persons.repository.ts`, `persons.service.ts`): `findOrCreateByNik` (cari lewat `nik_hash`), `createWithoutNik` (wajib `no_nik_reason`, kembalikan kandidat ganda dari nama + tanggal lahir + keluarga), `findOrCreateFamily` (lewat `kk_hash`)
- [X] T036 [P] Definisikan konstanta jenis bencana dan utilitas bitmask di `packages/shared/src/spm/hazards.ts` (`HAZARDS`, `toMask`, `fromMask`, `variationLabel`) dengan uji unit di `packages/shared/src/spm/hazards.spec.ts`; sepuluh kode: `gempa, tsunami, banjir, longsor, gunung_api, gelombang_ekstrim, angin_topan, kekeringan, karhutla, epidemi`
- [X] T037 [P] Implementasikan perhitungan kelompok umur di `packages/shared/src/spm/age-group.ts` (`ageGroup(birthDate, referenceDate, bands) → balita | anak | dewasa | lansia`) dengan uji batas (tepat 5, 18, 60 tahun) di `packages/shared/src/spm/age-group.spec.ts`
- [X] T038 Implementasikan layanan tahun anggaran dasar di `apps/api/src/modules/spm/fiscal-years/` (`fiscal-years.module.ts`, `fiscal-years.controller.ts`, `fiscal-years.service.ts`, `fiscal-years.repository.ts`): `GET /spm/fiscal-years`, `POST /spm/fiscal-years` (tanpa salin maju), `PATCH /spm/fiscal-years/:fy/settings`; helper `assertWritable(fy)` yang melempar 423
- [X] T039 Buat skrip seed di `apps/api/src/db/seed/` (`seed-reference.ts` untuk `hazard_types` dan wilayah contoh, `seed-spm.ts` untuk tahun 2026, tiga kelurahan, akun `pendata_kelurahan`, `operator_bpbd`, `admin_bpbd`); skrip `db:seed`, `db:seed:spm`

### Kerangka antarmuka

- [X] T040 [P] Buat klien API di `apps/web/src/lib/api-client.ts` (fetch + CSRF + pemetaan galat) dan penyedia sesi di `apps/web/src/lib/session.tsx`
- [X] T041 [P] Buat kerangka aplikasi di `apps/web/src/app/` (`router.tsx`, `AppLayout.tsx`, `RequireRole.tsx`) dan halaman masuk di `apps/web/src/features/auth/LoginPage.tsx`
- [X] T042 [P] Buat komponen dasar aksesibel di `apps/web/src/components/` (`DataTable.tsx`, `FormField.tsx`, `ConfirmDialog.tsx`, `Toast.tsx`, `FiscalYearSwitcher.tsx`), masing-masing satu berkas
- [X] T043 Uji integrasi fondasi di `apps/api/test/foundation/` (`auth.int.spec.ts`, `roles-default-deny.int.spec.ts`, `audit-immutable.int.spec.ts`): rute tanpa `@Roles` mengembalikan 403; `UPDATE`/`DELETE` pada `audit_log` ditolak basis data

**Checkpoint**: fondasi siap; user story dapat dimulai

---

## Phase 3: User Story 1 - Pendataan warga per kelurahan (Priority: P1) 🎯 MVP

**Goal**: pendata kelurahan dan operator BPBD mengisi atau mengunggah daftar warga kawasan rawan
bencana, dengan validasi per baris dan persetujuan BPBD.

**Independent Test**: unggah lembar kerja sintetis satu kelurahan berisi baris benar dan salah;
baris benar tersimpan, baris salah dilaporkan dengan alasan, lalu disetujui operator.

### Tests for User Story 1

- [X] T044 [P] [US1] Uji unit aturan validasi dan normalisasi impor di `packages/shared/src/spm/validation/resident-row.spec.ts`: satu kasus per kode galat pada contracts/import.md
- [X] T045 [P] [US1] Uji integrasi impor di `apps/api/test/spm/import.int.spec.ts`: berkas 1.000 baris dengan 50 salah → 950 `baru`, 50 `ditolak`; unggah ulang → 0 baru, 0 berubah; RT/RW di luar kawasan → `DI_LUAR_KAWASAN_RAWAN`
- [X] T046 [P] [US1] Uji integrasi akses dan persetujuan di `apps/api/test/spm/residents-access.int.spec.ts`: pendata tidak dapat membaca kelurahan lain (403); baris pendata berstatus `menunggu`; daftar tidak memuat NIK/KK utuh; pembukaan rincian tercatat audit

### Implementation for User Story 1

- [X] T047 [P] [US1] Buat skema `hazard_zones` di `apps/api/src/db/schema/hazard-zones.ts`: `fiscal_year_id`, `kelurahan_id`, `rw text`, `rt text nullable` (null = seluruh RW), `hazard_mask smallint` (≥ 1 jenis), `basis` enum `krb | keputusan_bpbd`, `basis_ref`, `geom geometry(MultiPolygon,4326) nullable`; unik `(fiscal_year_id, kelurahan_id, rw, rt)`
- [X] T048 [P] [US1] Buat skema `resident_records` di `apps/api/src/db/schema/resident-records.ts` sesuai data-model.md: `person_id` unik bersama `fiscal_year_id`; `kelurahan_id` wajib; `rw`, `rt` wajib; `address_enc`; `is_poor`; `has_special_needs`; `special_needs_enc` (wajib bila `has_special_needs`); `age_group` enum `balita | anak | dewasa | lansia`; `age_group_override_reason`; `hazard_mask`; `is_active`; `inactive_reason` enum `meninggal | pindah | lainnya`; `approval_status` enum `menunggu | disetujui | dikembalikan`; `source`, `source_date`; `import_batch_id`; `row_version integer`; indeks `(fiscal_year_id, kelurahan_id, approval_status, is_active)`, `(fiscal_year_id, hazard_mask)`, `family_id`
- [X] T049 [P] [US1] Buat skema `import_batches` dan `import_rows` di `apps/api/src/db/schema/import-batches.ts` dan `apps/api/src/db/schema/import-rows.ts` sesuai data-model.md (`status` enum `divalidasi | dikonfirmasi | dibatalkan`; `outcome` enum `baru | berubah | sama | ditolak`; `errors jsonb` berisi `{column, code, message}`)
- [X] T050 [P] [US1] Buat skema `data_corrections` di `apps/api/src/db/schema/data-corrections.ts`: `status` enum `diajukan | diterima | ditolak`
- [X] T051 [US1] Buat migrasi untuk T047-T050 dan pasang pemicu `spm_assert_year_writable` pada `hazard_zones` dan `resident_records` di `apps/api/src/db/migrations/`
- [X] T052 [P] [US1] Definisikan Form 5.A.1 dan 5.A.2 di `packages/shared/src/spm/forms/form-5a1.ts` dan `packages/shared/src/spm/forms/form-5a2.ts` (judul, kepala bertingkat, sel gabung, penomoran kolom, pemetaan kolom → bidang) serta tipe `FormDefinition` di `packages/shared/src/spm/forms/types.ts`
- [X] T053 [P] [US1] Buat skema Zod dan normalisasi baris warga di `packages/shared/src/spm/validation/resident-row.ts` dan kode galat di `packages/shared/src/spm/validation/error-codes.ts` persis sesuai tabel pada contracts/import.md
- [X] T054 [US1] Implementasikan kawasan rawan di `apps/api/src/modules/spm/hazard-zones/` (`hazard-zones.controller.ts`, `hazard-zones.service.ts`, `hazard-zones.repository.ts`): CRUD hanya `admin_bpbd`/`super_admin`; `resolveZone(fy, kelurahanId, rw, rt)` mengembalikan kawasan atau null
- [X] T055 [US1] Implementasikan repository warga di `apps/api/src/modules/spm/residents/residents.repository.ts`: daftar berkursor dengan filter kelurahan, RT/RW, status, nama (trigram), NIK (cocok `nik_hash`); selalu melewati `KelurahanScope`
- [X] T056 [US1] Implementasikan layanan warga di `apps/api/src/modules/spm/residents/residents.service.ts`: buat/ubah (wajib `row_version`, 409 bila usang), tolak bila RT/RW di luar kawasan, isi awal `hazard_mask` dari kawasan, hitung `age_group`, nonaktifkan dengan alasan; status awal `menunggu` untuk pendata dan `disetujui` untuk operator/admin
- [X] T057 [US1] Implementasikan pemetaan tampilan di `apps/api/src/modules/spm/residents/residents.mapper.ts`: daftar memakai `nik_last4`/`kk_last4`; rincian mendekripsi NIK, KK, alamat, jenis kebutuhan khusus
- [X] T058 [US1] Implementasikan controller warga di `apps/api/src/modules/spm/residents/residents.controller.ts` untuk jalur `/:fy/residents*` pada contracts/api.md dengan `@Roles` dan `@Audit`
- [X] T059 [US1] Implementasikan persetujuan di `apps/api/src/modules/spm/residents/approval.service.ts` dan `approval.controller.ts`: `POST /:fy/residents/approve` menurut `batch_id`, `kelurahan_id`, atau daftar id; `POST /:fy/residents/return` dengan `note` wajib (FR-028)
- [X] T060 [P] [US1] Implementasikan pembaca lembar kerja di `apps/api/src/modules/spm/imports/xlsx-reader.ts`: baca beraliran dengan ExcelJS, temukan baris kepala dari baris penomoran kolom, cocokkan susunan kolom dengan `FormDefinition`, tolak seluruh berkas bila tidak cocok, abaikan kolom di luar formulir
- [X] T061 [P] [US1] Implementasikan pemadan wilayah di `apps/api/src/modules/spm/imports/region-matcher.ts`: skor ≥ 0,9 dipetakan otomatis; 0,5-0,9 dikembalikan sebagai pilihan; di bawahnya `WILAYAH_TIDAK_DIKENAL`; keputusan operator berlaku untuk semua baris berejaan sama
- [X] T062 [US1] Implementasikan validator impor di `apps/api/src/modules/spm/imports/import-validator.ts`: jalankan skema T053 per baris, periksa ganda dalam berkas, NIK di kelurahan lain, hak kelurahan pendata, kawasan rawan; tentukan `outcome` lewat kunci alami `(tahun, nik_hash)` atau `(nama, tanggal lahir, kk_hash)`
- [X] T063 [US1] Implementasikan layanan impor di `apps/api/src/modules/spm/imports/imports.service.ts`: unggah → simpan `import_batches`/`import_rows` → pratinjau; konfirmasi dalam satu transaksi (membuat `persons`, `families`, `resident_records`); batal; batas 10 MB dan 20.000 baris
- [X] T064 [US1] Implementasikan controller impor dan daftar galat di `apps/api/src/modules/spm/imports/imports.controller.ts` dan `apps/api/src/modules/spm/imports/error-report.ts` (`errors.xlsx`) untuk jalur `/:fy/imports*`
- [X] T065 [P] [US1] Implementasikan pembersih data mentah di `apps/api/src/modules/spm/imports/import-cleanup.ts`: hapus NIK/KK dari `import_rows` saat konfirmasi/batal dan lewat tugas terjadwal harian untuk berkas berusia > 7 hari
- [X] T066 [P] [US1] Implementasikan pembuat templat di `apps/api/src/modules/spm/imports/template-builder.ts` dan jalur `GET /spm/templates/:formCode`: kepala resmi, validasi sel (daftar pilihan, panjang NIK 16), lembar rujukan kelurahan dan RT/RW kawasan rawan milik pengguna
- [X] T067 [P] [US1] Implementasikan ringkasan kelengkapan di `apps/api/src/modules/spm/residents/completeness.service.ts` dan jalur `GET /:fy/completeness`: per kelurahan jumlah baris, menunggu, belum lengkap, tanpa NIK (FR-018)
- [X] T068 [P] [US1] Implementasikan pembetulan data dan penggabungan orang di `apps/api/src/modules/spm/residents/corrections.controller.ts` dan `apps/api/src/modules/persons/merge.service.ts` (`POST /persons/:id/merge`, FR-025)
- [X] T069 [P] [US1] Buat hook dan klien di `apps/web/src/features/spm/residents/api.ts` dan `apps/web/src/features/spm/imports/api.ts`
- [X] T070 [P] [US1] Buat layar daftar warga di `apps/web/src/features/spm/residents/ResidentsPage.tsx`, `ResidentsTable.tsx`, `ResidentFilters.tsx` (NIK/KK tersamar, filter kelurahan/RT/RW/status)
- [X] T071 [P] [US1] Buat formulir warga di `apps/web/src/features/spm/residents/ResidentForm.tsx`, `HazardCheckboxes.tsx`, `ResidentDetailDrawer.tsx` (cari orang lewat NIK sebelum membuat baru; penanda "NIK belum ada" dengan alasan)
- [X] T072 [US1] Buat alur impor di `apps/web/src/features/spm/imports/ImportPage.tsx`, `ImportPreview.tsx`, `RegionMappingDialog.tsx`, `ImportErrorsTable.tsx` (unduh templat, unggah, pratinjau, pilih padanan wilayah, konfirmasi)
- [X] T073 [P] [US1] Buat layar persetujuan dan kelengkapan di `apps/web/src/features/spm/residents/ApprovalQueuePage.tsx` dan `CompletenessPage.tsx`
- [X] T074 [P] [US1] Buat layar kawasan rawan di `apps/web/src/features/spm/hazard-zones/HazardZonesPage.tsx` dan `HazardZoneForm.tsx`
- [X] T075 [P] [US1] Buat pembangkit data sintetis di `tools/spm-fixtures/gen-resident-sheet.ts` (opsi `--rows`, `--errors`, `--out`) dan skrip `spm:gen-fixture`

**Checkpoint**: US1 berfungsi dan dapat diuji sendiri (quickstart skenario 1-6, 13)

---

## Phase 4: User Story 2 - Rekapitulasi otomatis dan ekspor formulir resmi (Priority: P1)

**Goal**: Form 5.A.3, 5.A.4, 5.A.6 dihitung dari rincian, tiap angka dapat ditelusuri, dan
formulir dapat diekspor dalam susunan resmi.

**Independent Test**: dengan data yang jumlahnya diketahui, angka rekap sama dengan hitungan
manual, dan kepala berkas ekspor sama dengan templat resmi.

### Tests for User Story 2

- [X] T076 [P] [US2] Uji integrasi rekap di `apps/api/test/spm/recap.int.spec.ts`: untuk setiap sel 5.A.3, 5.A.4, 5.A.6, jumlah `rows` hasil penelusuran sama dengan nilai sel; baris `menunggu` dan nonaktif tidak terhitung; orang tanpa NIK terhitung
- [X] T077 [P] [US2] Uji berkas emas di `apps/api/test/spm/export-golden.int.spec.ts`: struktur kepala XLSX (judul, sel gabung, penomoran kolom) Form 5.A.1-5.A.4 dan 5.A.6 sama dengan rujukan `cells` dan `merged_ranges` di `specs/002-spm-data-dasar/reference/form-headers/form-5a*.header.json`

### Implementation for User Story 2

- [X] T078 [P] [US2] Definisikan tipe dan pustaka sel rekap di `packages/shared/src/spm/recap/types.ts` (`CellDefinition { formCode, rowKey, colKey, predicate }`) dan pengode `cell_key` di `packages/shared/src/spm/recap/cell-key.ts`
- [X] T079 [P] [US2] Definisikan sel Form 5.A.3 di `packages/shared/src/spm/recap/recap-5a3.ts`: baris = kelurahan (dengan jumlah per kecamatan); kolom dinamis per `hazard_mask` berbeda: kelompok jenis, KK (`count distinct family_id`), jiwa; total = penjumlahan variasi
- [X] T080 [P] [US2] Definisikan sel Form 5.A.4 di `packages/shared/src/spm/recap/recap-5a4.ts` sesuai tabel rumus pada contracts/forms.md (kolom 4-13)
- [X] T081 [P] [US2] Definisikan sel Form 5.A.6 di `packages/shared/src/spm/recap/recap-5a6.ts` sesuai contracts/forms.md; total wajib latih mengikuti rumus kepala kolom (kolom 4 + kolom 10)
- [X] T082 [US2] Implementasikan penyusun kueri rekap di `apps/api/src/modules/spm/recap/recap-query.builder.ts`: menerjemahkan `predicate` menjadi klausa SQL yang dipakai sama untuk agregat dan untuk penelusuran; selalu menyaring `approval_status = disetujui` dan `is_active`
- [X] T083 [US2] Implementasikan layanan dan controller rekap di `apps/api/src/modules/spm/recap/recap.service.ts` dan `recap.controller.ts`: `GET /:fy/recap/:formCode` dan `GET /:fy/recap/:formCode/cells/:cellKey/rows` (tercatat audit, mengikuti `KelurahanScope`)
- [X] T084 [P] [US2] Definisikan Form 5.A.3, 5.A.4, 5.A.6 di `packages/shared/src/spm/forms/form-5a3.ts`, `form-5a4.ts`, `form-5a6.ts`
- [X] T085 [P] [US2] Implementasikan penulis XLSX di `apps/api/src/modules/spm/exports/xlsx-writer.ts`: menggambar kepala laporan (provinsi, kabupaten/kota, tahun anggaran), kepala bertingkat, sel gabung, penomoran kolom, dan baris data dari `FormDefinition`
- [X] T086 [P] [US2] Implementasikan penulis PDF di `apps/api/src/modules/spm/exports/pdf-writer.ts` dengan pdfmake (lanskap) dari `FormDefinition` yang sama
- [X] T087 [US2] Implementasikan penyedia data formulir di `apps/api/src/modules/spm/exports/providers/` (`form-5a1.provider.ts`, `form-5a2.provider.ts`, `recap.provider.ts`): urutan baris sesuai contracts/forms.md; kolom turunan (kelompok umur rentan, centang kerawanan, nomor variasi) dihitung
- [X] T088 [US2] Implementasikan layanan dan controller ekspor di `apps/api/src/modules/spm/exports/exports.service.ts` dan `exports.controller.ts`: `GET /:fy/forms/:formCode/export?format=xlsx|pdf&kelurahan=` dan `GET /:fy/forms/export-all` (ZIP); tercatat audit; pendata hanya 5.A.1/5.A.2 kelurahannya
- [X] T089 [P] [US2] Buat layar rekap di `apps/web/src/features/spm/recap/RecapPage.tsx`, `RecapTable.tsx`, `CellDrilldownDrawer.tsx` (klik angka → daftar penyusun)
- [X] T090 [P] [US2] Buat layar ekspor di `apps/web/src/features/spm/exports/ExportsPage.tsx` dan `ExportButton.tsx`

**Checkpoint**: MVP SPM. Form 5.A.1-5.A.4 dan 5.A.6 dapat dilaporkan (quickstart skenario 7-9)

---

## Phase 5: User Story 3 - Daftar petugas dan aparatur (Priority: P2)

**Goal**: petugas tercatat dengan status, sertifikasi, penugasan, dan dapat dipilih dari relawan.

**Independent Test**: tambah satu petugas baru dan satu dari relawan; keduanya muncul pada Form
5.A.5 dan terhitung pada 5.A.4 dan 5.A.6.

### Tests for User Story 3

- [X] T091 [P] [US3] Uji integrasi petugas di `apps/api/test/spm/officers.int.spec.ts`: NIK yang sudah tercatat sebagai warga memakai `persons` yang sama; petugas terhitung pada kolom aparatur 5.A.4 dan kolom petugas 5.A.6

### Implementation for User Story 3

- [X] T092 [US3] Buat skema `officer_records` di `apps/api/src/db/schema/officer-records.ts`: unik `(fiscal_year_id, person_id)`; `volunteer_id nullable`; `position` enum `kasi_trantibumlinmas | babinsa | bhabinkamtibmas | linmas | relawan | lainnya`; `employment_status` enum `pns | tni | polri | satlinmas | kontrak | non_aparatur` (diisi otomatis dari jabatan: kasi → pns, babinsa → tni, bhabinkamtibmas → polri, linmas → satlinmas, relawan → non_aparatur); `duty_kelurahan_id` (wajib kecuali jabatan `lainnya`); `certifications text`; `is_trc_klb`, `is_trc_pdb`, `is_ppe`, `is_ops`; `post_type` enum `posko | pos_lapangan` nullable; `post_kelurahan_id`; `hazard_mask`; `note`; migrasi dan pemicu kunci tahun
- [X] T093 [P] [US3] Definisikan Form 5.A.5 di `packages/shared/src/spm/forms/form-5a5.ts` dan skema baris impor petugas di `packages/shared/src/spm/validation/officer-row.ts`
- [X] T094 [US3] Implementasikan modul petugas di `apps/api/src/modules/spm/officers/` (`officers.controller.ts`, `officers.service.ts`, `officers.repository.ts`): jalur `/:fy/officers*`; data diri diambil dari `persons`
- [X] T095 [US3] Implementasikan antarmuka sumber relawan di `apps/api/src/modules/spm/officers/volunteer-source.ts` (`VolunteerSource.getVerified(volunteerId) → { personId, certifications }`) dan `POST /:fy/officers/from-volunteer/:volunteerId`; implementasi nyata disambungkan saat modul relawan fitur 001 tersedia, sementara mengembalikan 501 dengan pesan jelas
- [X] T096 [P] [US3] Tambahkan impor Form 5.A.5 di `apps/api/src/modules/spm/imports/officer-import.ts` memakai pembaca dan alur pratinjau US1
- [X] T097 [P] [US3] Tambahkan penyedia ekspor di `apps/api/src/modules/spm/exports/providers/form-5a5.provider.ts` dan lengkapi predikat petugas pada `recap-5a4.ts` dan `recap-5a6.ts`: kolom 4-8 Form 5.A.4 dihitung menurut `duty_kelurahan_id`, kolom 14 diisi "Relawan: n orang" dari jabatan `relawan`
- [X] T098 [P] [US3] Buat layar petugas di `apps/web/src/features/spm/officers/OfficersPage.tsx`, `OfficerForm.tsx`, `PickVolunteerDialog.tsx`

**Checkpoint**: US3 berfungsi (quickstart skenario 10)

---

## Phase 6: User Story 4 - Kejadian bencana, warga terdampak, petugas aktif (Priority: P2)

**Goal**: mencatat kejadian, warga terdampak, status korban, dan petugas aktif per kejadian.

**Independent Test**: satu kejadian dengan tiga warga terdampak berstatus berbeda dan dua petugas
aktif; Form 5.A.9-5.A.12 dapat diekspor.

### Tests for User Story 4

- [ ] T099 [P] [US4] Uji integrasi kejadian di `apps/api/test/spm/events.int.spec.ts`: kategori status darurat (tanpa penetapan, 10 jam, 30 jam setelah laporan); perubahan status korban menambah riwayat; korban baru tanpa catatan membuat `persons`

### Implementation for User Story 4

- [ ] T100 [P] [US4] Buat skema `disaster_events` di `apps/api/src/db/schema/disaster-events.ts`: `occurred_at`, `reported_at` (≥ `occurred_at`), `location_text`, `kelurahan_id nullable`, `location geography(Point,4326) nullable`, `emergency_declared_at nullable` (null = tidak dikeluarkan), `emergency_doc_file_id`
- [ ] T101 [P] [US4] Buat skema `affected_persons` dan `affected_status_history` di `apps/api/src/db/schema/affected-persons.ts` dan `affected-status-history.ts`: unik `(event_id, person_id)`; `status` enum `meninggal | hilang | medis_darurat | medis_lanjut | selamat`; `is_displaced`; riwayat hanya-tambah
- [ ] T102 [P] [US4] Buat skema `event_officers` di `apps/api/src/db/schema/event-officers.ts`: unik `(event_id, officer_record_id)`; penanda penugasan; `post_type`; `post_kecamatan_id`; `post_kelurahan_id`
- [ ] T103 [US4] Buat migrasi untuk T100-T102 dengan pemicu kunci tahun di `apps/api/src/db/migrations/`
- [ ] T104 [P] [US4] Implementasikan turunan status darurat di `packages/shared/src/spm/emergency-status.ts` (`tidak_dikeluarkan | kurang_24_jam | lebih_24_jam` dari `reported_at` dan `emergency_declared_at`) dengan uji unit
- [ ] T105 [US4] Implementasikan modul kejadian di `apps/api/src/modules/spm/events/` (`events.controller.ts`, `events.service.ts`, `events.repository.ts`): jalur `/:fy/events*`
- [ ] T106 [US4] Implementasikan warga terdampak di `apps/api/src/modules/spm/events/affected.controller.ts` dan `affected.service.ts`: ambil data diri dari `persons`; buat orang baru dengan data minimum bila belum ada; tulis riwayat tiap perubahan status
- [ ] T107 [P] [US4] Implementasikan petugas aktif di `apps/api/src/modules/spm/events/event-officers.controller.ts` dan `event-officers.service.ts`
- [ ] T108 [P] [US4] Definisikan Form 5.A.9-5.A.12 di `packages/shared/src/spm/forms/form-5a9.ts`, `form-5a10.ts`, `form-5a11.ts`, `form-5a12.ts` dan penyedia ekspornya di `apps/api/src/modules/spm/exports/providers/events.provider.ts`; formulir kosong diekspor dengan keterangan "nihil"
- [ ] T109 [P] [US4] Buat layar kejadian di `apps/web/src/features/spm/events/EventsPage.tsx`, `EventForm.tsx`, `EventDetailPage.tsx`, `AffectedTable.tsx`, `EventOfficersTable.tsx`

**Checkpoint**: US4 berfungsi (quickstart skenario 11-12)

---

## Phase 7: User Story 5 - Inventaris peralatan dan stok logistik (Priority: P3)

**Goal**: mencatat dan mengekspor Form 5.A.7 dan 5.A.8.

**Independent Test**: tambah lima peralatan dan lima barang logistik; keduanya dapat diekspor.

- [ ] T110 [P] [US5] Buat skema `equipment` dan `logistics_stock` di `apps/api/src/db/schema/equipment.ts` dan `logistics-stock.ts` dengan CHECK `qty_good + qty_broken ≤ quantity`; migrasi dan pemicu kunci tahun
- [ ] T111 [US5] Implementasikan modul inventaris di `apps/api/src/modules/spm/inventory/` (`equipment.controller.ts`, `logistics.controller.ts`, `inventory.service.ts`, `inventory.repository.ts`) untuk jalur `/:fy/equipment*` dan `/:fy/logistics*`
- [ ] T112 [P] [US5] Definisikan Form 5.A.7 dan 5.A.8 di `packages/shared/src/spm/forms/form-5a7.ts`, `form-5a8.ts` dan penyedia ekspor di `apps/api/src/modules/spm/exports/providers/inventory.provider.ts`
- [ ] T113 [P] [US5] Buat layar inventaris di `apps/web/src/features/spm/inventory/EquipmentPage.tsx`, `LogisticsPage.tsx`, `InventoryForm.tsx`
- [ ] T114 [P] [US5] Uji integrasi inventaris di `apps/api/test/spm/inventory.int.spec.ts`: jumlah baik + rusak melebihi ketersediaan ditolak

**Checkpoint**: US5 berfungsi

---

## Phase 8: User Story 6 - Tahun anggaran, finalisasi, dan revisi (Priority: P3)

**Goal**: finalisasi dengan arsip, revisi bernomor, dan pembukaan tahun baru dengan salin maju.

**Independent Test**: finalkan tahun, pastikan terkunci, buka revisi, ubah satu baris, finalkan
lagi; arsip revisi sebelumnya tetap dapat diunduh.

### Tests for User Story 6

- [ ] T115 [P] [US6] Uji integrasi siklus tahun di `apps/api/test/spm/fiscal-year-cycle.int.spec.ts`: finalisasi ditolak bila ada baris `menunggu`; tulis pada tahun final → 423 (layanan) dan ditolak pemicu (SQL langsung); revisi menaikkan `revision_no`; arsip revisi 0 tetap ada; salin maju menyalin warga aktif yang disetujui, kawasan, petugas, inventaris, tidak menyalin kejadian, dan menghitung ulang `age_group`

### Implementation for User Story 6

- [ ] T116 [US6] Buat skema `fiscal_year_snapshots` di `apps/api/src/db/schema/fiscal-year-snapshots.ts` (hanya-tambah): `revision_no`, `reason` (wajib untuk revisi), `recap_json`, `archive_file_id`, `sha256`; migrasi dan pemicu penolak `UPDATE`/`DELETE`
- [ ] T117 [US6] Implementasikan finalisasi di `apps/api/src/modules/spm/fiscal-years/finalize.service.ts`: periksa tidak ada baris `menunggu`, hasilkan ZIP seluruh ekspor lewat layanan ekspor, simpan cuplikan rekap dan sidik SHA-256, ubah status ke `final` dalam satu transaksi
- [ ] T118 [US6] Implementasikan revisi di `apps/api/src/modules/spm/fiscal-years/revision.service.ts`: `POST /:fy/revisions` dengan `reason` wajib → status `revisi`, `revision_no + 1`; finalisasi berikutnya membuat cuplikan baru
- [ ] T119 [US6] Implementasikan salin maju di `apps/api/src/modules/spm/fiscal-years/copy-forward.service.ts`: `INSERT ... SELECT` per tabel dalam satu transaksi sesuai aturan data-model.md
- [ ] T120 [US6] Lengkapi controller di `apps/api/src/modules/spm/fiscal-years/fiscal-years.controller.ts` dengan `finalize`, `revisions`, `snapshots`, `snapshots/:rev/archive`, dan `copy_from` pada `POST /fiscal-years`
- [ ] T121 [P] [US6] Buat layar tahun anggaran di `apps/web/src/features/spm/fiscal-years/FiscalYearsPage.tsx`, `FinalizeDialog.tsx`, `RevisionDialog.tsx`, `SnapshotsTable.tsx`

**Checkpoint**: seluruh user story berfungsi (quickstart skenario 14-17)

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T122 [P] Uji matriks izin menyeluruh di `apps/api/test/spm/permission-matrix.int.spec.ts`: setiap jalur pada contracts/api.md × setiap peran, termasuk tepat satu entri audit per jalur bertanda "Audit: ya"
- [ ] T123 [P] Uji beban rekap di `tools/spm-fixtures/load-test.ts` (skrip `spm:load-test --residents 200000`): rekap seluruh kota ≤ 5 detik; catat hasil di `specs/002-spm-data-dasar/load-test-result.md`
- [ ] T124 [P] Lengkapi berkas emas untuk Form 5.A.5 dan 5.A.7-5.A.12 di `apps/api/test/spm/export-golden.int.spec.ts` terhadap rujukan di `specs/002-spm-data-dasar/reference/form-headers/`; Form 5.A.9 memakai `official_title`
- [ ] T125 [P] Uji ujung-ke-ujung alur utama di `apps/web/tests/spm/import-approve-recap.e2e.ts` beserta pemindaian aksesibilitas (axe) pada layar warga, impor, rekap
- [ ] T126 [P] Tulis panduan operator dan pendata dalam bahasa Indonesia di `docs/spm/panduan-pendata.md`, `docs/spm/panduan-operator.md`, `docs/spm/finalisasi-dan-revisi.md`
- [ ] T127 Jalankan `pnpm lint` dan pecah setiap berkas yang melampaui 400 baris; pastikan pemeriksaan `max-lines` aktif di CI tanpa pengecualian selain migrasi
- [ ] T128 Tinjau keamanan: tidak ada NIK/KK/alamat pada log aplikasi, `audit_log.detail`, URL, atau pesan galat; cadangan terenkripsi terdokumentasi di `docs/operasi/cadangan.md`
- [ ] T129 Jalankan seluruh skenario quickstart.md dan catat hasilnya di `specs/002-spm-data-dasar/quickstart-result.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: tanpa ketergantungan
- **Foundational (Phase 2)**: setelah Setup; MEMBLOKIR semua user story
- **US1 (Phase 3)**: setelah Foundational
- **US2 (Phase 4)**: setelah US1 (membutuhkan `resident_records` dan `hazard_zones`)
- **US3 (Phase 5)**: setelah Foundational; penyedia ekspor dan sel rekapnya membutuhkan US2
- **US4 (Phase 6)**: setelah Foundational; petugas aktif (T107) membutuhkan US3; ekspor membutuhkan US2
- **US5 (Phase 7)**: setelah Foundational; ekspor membutuhkan US2
- **US6 (Phase 8)**: finalisasi membutuhkan layanan ekspor US2; salin maju menyalin tabel US1, US3, US5
- **Polish (Phase 9)**: setelah story yang diinginkan selesai

### Within Each User Story

- Uji ditulis lebih dulu dan gagal sebelum implementasi
- Skema → migrasi → definisi bersama → repository → layanan → controller → antarmuka

### Parallel Opportunities

- Phase 1: T002, T003, T005-T009 setelah T001
- Phase 2: T011-T014 bersamaan; T016-T020 bersamaan; T029-T033 sebagian besar bersamaan; T040-T042 bersamaan dengan pekerjaan server
- US1: T047-T050 (skema), T052-T053 (paket bersama), T060-T061 (impor), T069-T075 (antarmuka dan perkakas)
- US2: T078-T081 dan T084-T086 bersamaan
- US3, US4, US5 dapat dikerjakan paralel oleh orang berbeda setelah US2

## Parallel Example: User Story 1

```bash
# Uji US1 bersamaan:
Task: "T044 Uji unit validasi di packages/shared/src/spm/validation/resident-row.spec.ts"
Task: "T045 Uji integrasi impor di apps/api/test/spm/import.int.spec.ts"
Task: "T046 Uji integrasi akses di apps/api/test/spm/residents-access.int.spec.ts"

# Skema US1 bersamaan:
Task: "T047 hazard_zones"  Task: "T048 resident_records"
Task: "T049 import_batches + import_rows"  Task: "T050 data_corrections"
```

## Implementation Strategy

### MVP First

1. Phase 1 dan Phase 2
2. US1 → validasi dengan lembar kerja sintetis
3. US2 → Form 5.A.1-5.A.4 dan 5.A.6 dapat dilaporkan; **berhenti dan validasi bersama BPBD**

### Incremental Delivery

US3 (petugas) → US4 (kejadian) → US5 (inventaris) → US6 (finalisasi) → Polish. Tiap story
diuji dan dapat didemokan sendiri.

### Hal yang harus dikonfirmasi sebelum data nyata dimasukkan

Dasar hukum pemrosesan data warga (ditunda pemilik proyek); penempatan jumlah relawan pada kolom
keterangan Form 5.A.4; sumber batas wilayah dan daftar kelurahan resmi. Sudah diputuskan
2026-11-15: penyimpangan Prinsip I disetujui untuk fitur ini; aparatur Form 5.A.4 dihitung
menurut kelurahan wilayah tugas; judul Form 5.A.9.

## Notes

- Tugas [P] menyentuh berkas berbeda dan tidak saling bergantung
- Commit setelah tiap tugas atau kelompok logis
- Berkas kode tidak boleh melampaui 400 baris; pecah sebelum menambah isi
- Modul relawan fitur 001 belum memiliki tasks.md; T095 menyediakan titik sambungnya
