# Data Model: Data Dasar SPM Sub-Urusan Bencana (Form 5.A)

PostgreSQL + PostGIS. Semua tabel memiliki `id uuid`, `created_at`, `updated_at`, `created_by`
kecuali disebutkan lain. Kolom bertanda 🔒 dienkripsi di aplikasi (AES-256-GCM). Tabel dari
fitur 001 yang dipakai ulang: `users`, `regions`, `files`, `audit_log`, `app_settings`,
`volunteers`, `evidences`.

## Entitas bersama

### persons

| Kolom | Tipe | Aturan |
|---|---|---|
| nik_enc 🔒 | bytea, nullable | 16 digit bila terisi |
| nik_hash | bytea, unik bila terisi | HMAC-SHA-256 |
| nik_last4 | char(4), nullable | tampilan tersamar |
| no_nik_reason | text, nullable | wajib bila NIK kosong |
| full_name | text | wajib; indeks trigram |
| gender | enum `L`, `P` | |
| birth_place | text | |
| birth_date | date, nullable | tidak di masa depan |
| merged_into_id | uuid → persons, nullable | hasil penggabungan catatan ganda |

Aturan: tepat satu dari `nik_hash` atau `no_nik_reason` terisi. Orang tanpa NIK diperiksa
kemungkinan gandanya dari `(full_name, birth_date, family_id)`.

### families

`kk_enc 🔒`, `kk_hash` unik, `kk_last4`, `head_person_id → persons`.

Perubahan pada fitur 001: `volunteers` memperoleh `person_id → persons`; kolom identitas
(`full_name`, `nik_*`, `birth_date`, `gender`) pindah ke `persons`.

## Tahun anggaran

### fiscal_years

| Kolom | Tipe | Aturan |
|---|---|---|
| year | smallint, unik | |
| status | enum `terbuka`, `final`, `revisi` | |
| revision_no | smallint | 0 saat final pertama |
| age_reference_date | date | bawaan 31 Desember tahun itu |
| age_bands | jsonb | bawaan: balita < 5, anak 5-<18, lansia ≥ 60 |
| copied_from_id | uuid → fiscal_years, nullable | |
| finalized_at, finalized_by | | |

### fiscal_year_snapshots (hanya-tambah)

`fiscal_year_id`, `revision_no`, `reason` (wajib untuk revisi), `recap_json jsonb`,
`archive_file_id → files` (ZIP seluruh ekspor), `sha256`, `created_by`, `created_at`.

## Kawasan rawan dan warga

### hazard_types (rujukan)

`code` (`gempa`, `tsunami`, `banjir`, `longsor`, `gunung_api`, `gelombang_ekstrim`,
`angin_topan`, `kekeringan`, `karhutla`, `epidemi`), `name`, `bit` (0-9), `form_order`.

### hazard_zones

| Kolom | Tipe | Aturan |
|---|---|---|
| fiscal_year_id | uuid | |
| kelurahan_id | uuid → regions | |
| rw | text | |
| rt | text, nullable | null = seluruh RW |
| hazard_mask | smallint | ≥ 1 jenis bencana |
| basis | enum `krb`, `keputusan_bpbd` | |
| basis_ref | text | nomor/judul dokumen |
| geom | geometry(MultiPolygon,4326), nullable | untuk peta |

Unik `(fiscal_year_id, kelurahan_id, rw, rt)`.

### resident_records (Form 5.A.1, 5.A.2)

| Kolom | Tipe | Aturan |
|---|---|---|
| fiscal_year_id | uuid | |
| person_id | uuid → persons | unik bersama `fiscal_year_id` |
| family_id | uuid → families, nullable | |
| is_family_head | boolean | |
| kelurahan_id | uuid → regions | wajib |
| rw, rt | text | wajib; harus cocok dengan `hazard_zones` |
| hazard_zone_id | uuid → hazard_zones | diisi otomatis |
| address_enc 🔒 | bytea | alamat rinci |
| is_poor | boolean | kondisi ekonomi |
| has_special_needs | boolean | |
| special_needs_enc 🔒 | bytea, nullable | wajib bila `has_special_needs` |
| age_group | enum `balita`, `anak`, `dewasa`, `lansia` | dihitung dari tanggal lahir |
| age_group_override_reason | text, nullable | bila dikoreksi manual |
| hazard_mask | smallint | awal dari kawasan; dapat dikoreksi |
| is_active | boolean | |
| inactive_reason | enum `meninggal`, `pindah`, `lainnya`, nullable | |
| inactive_date | date, nullable | |
| approval_status | enum `menunggu`, `disetujui`, `dikembalikan` | |
| approval_note | text, nullable | |
| approved_by, approved_at | | |
| source | text | pendata/instansi |
| source_date | date | |
| import_batch_id | uuid → import_batches, nullable | |
| row_version | integer | kunci optimistik |

Indeks: `(fiscal_year_id, kelurahan_id, approval_status, is_active)`,
`(fiscal_year_id, hazard_mask)`, `family_id`.

Kolom turunan untuk formulir: "kelompok umur rentan" = `age_group ≠ dewasa`; nomor variasi
kerawanan = peringkat `hazard_mask` yang berbeda dalam satu tahun.

### data_corrections

`person_id`, `fiscal_year_id`, `requested_via`, `message`, `status` (`diajukan`, `diterima`,
`ditolak`), `resolved_by`, `resolution_note`.

## Petugas

### officer_records (Form 5.A.5)

| Kolom | Tipe | Aturan |
|---|---|---|
| fiscal_year_id, person_id | | unik berpasangan |
| volunteer_id | uuid → volunteers, nullable | bila dipilih dari relawan |
| position | enum `kasi_trantibumlinmas`, `babinsa`, `bhabinkamtibmas`, `linmas`, `relawan`, `lainnya` | jabatan |
| employment_status | enum `pns`, `tni`, `polri`, `satlinmas`, `kontrak`, `non_aparatur` | diisi otomatis dari jabatan: kasi → `pns`, babinsa → `tni`, bhabinkamtibmas → `polri`, linmas → `satlinmas`, relawan → `non_aparatur`; bebas untuk `lainnya` |
| duty_kelurahan_id | uuid → regions, nullable | kelurahan wilayah tugas; wajib kecuali jabatan `lainnya`; dasar hitungan Form 5.A.4 |
| certifications | text | diisi otomatis dari `evidences` terverifikasi bila relawan |
| is_trc_klb, is_trc_pdb, is_ppe, is_ops | boolean | jenis penugasan |
| post_type | enum `posko`, `pos_lapangan`, nullable | |
| post_kelurahan_id | uuid → regions, nullable | lokasi posko/pos lapangan |
| hazard_mask | smallint | jenis bencana yang ditangani (Form 5.A.6) |
| note | text | |

Data diri, kondisi ekonomi, dan kebutuhan khusus petugas diambil dari `persons` dan
`resident_records` bila ada; bila tidak, kolom terkait pada formulir kosong.

## Kejadian bencana

### disaster_events (Form 5.A.12)

| Kolom | Tipe | Aturan |
|---|---|---|
| fiscal_year_id | uuid | |
| name | text | |
| hazard_type_id | uuid → hazard_types | |
| occurred_at | timestamptz | |
| reported_at | timestamptz | ≥ `occurred_at` |
| location_text | text | |
| kelurahan_id | uuid → regions, nullable | |
| location | geography(Point,4326), nullable | |
| emergency_declared_at | timestamptz, nullable | null = tidak dikeluarkan |
| emergency_doc_file_id | uuid → files, nullable | |

Turunan: kategori status darurat = `tidak dikeluarkan` bila null; `< 24 jam` bila
`emergency_declared_at - reported_at ≤ 24 jam`; selain itu `> 24 jam`.

### affected_persons (Form 5.A.9, 5.A.10)

`event_id`, `person_id` (unik berpasangan), `status` enum (`meninggal`, `hilang`,
`medis_darurat`, `medis_lanjut`, `selamat`), `is_displaced` boolean, `status_updated_at`.

### affected_status_history (hanya-tambah)

`affected_person_id`, `status`, `changed_at`, `changed_by`, `note`.

### event_officers (Form 5.A.11)

`event_id`, `officer_record_id` (unik berpasangan), `is_trc_klb`, `is_trc_pdb`, `is_ppe`,
`is_ops`, `post_type`, `post_kecamatan_id`, `post_kelurahan_id`.

## Inventaris

### equipment (Form 5.A.7)

`fiscal_year_id`, `name`, `quantity numeric`, `unit`, `support_kaji_cepat`,
`support_pencarian`, `support_korban_meninggal`, `support_medis`, `support_pengungsian`
(boolean), `location_text`, `institution`, `qty_good`, `qty_broken`.
Aturan: `qty_good + qty_broken ≤ quantity`.

### logistics_stock (Form 5.A.8)

`fiscal_year_id`, `name`, `quantity numeric`, `unit`, `location_text`, `institution`,
`qty_good`, `qty_broken`. Aturan sama.

## Impor

### import_batches

`fiscal_year_id`, `form_code` (`5.A.1`, `5.A.2`, `5.A.5`), `kelurahan_id` nullable, `file_id`,
`file_sha256`, `status` (`divalidasi`, `dikonfirmasi`, `dibatalkan`), `rows_total`, `rows_new`,
`rows_changed`, `rows_unchanged`, `rows_rejected`, `uploaded_by`, `confirmed_at`.

### import_rows

`batch_id`, `row_number`, `raw jsonb`, `normalized jsonb`, `errors jsonb` (daftar
`{column, code, message}`), `outcome` (`baru`, `berubah`, `sama`, `ditolak`), `target_id`.
Nilai NIK/KK pada `raw` dan `normalized` dihapus setelah berkas dikonfirmasi atau dibatalkan,
dan paling lambat 7 hari setelah diunggah.

## Rujukan pelaporan

### form_definitions

`form_code`, `version`, `regulation_ref`, `title`, `layout jsonb` (kepala bertingkat, sel gabung,
penomoran kolom, pemetaan kolom → sumber), `effective_from`. Tidak diubah setelah dipakai pada
tahun yang sudah final; perubahan = versi baru.

## Relasi ringkas

```text
persons 1—n resident_records n—1 fiscal_years        persons n—1 families (lewat records)
persons 1—n officer_records  n—1 fiscal_years        persons 1—0..1 volunteers (fitur 001)
hazard_zones 1—n resident_records                    regions 1—n hazard_zones
disaster_events 1—n affected_persons n—1 persons     disaster_events 1—n event_officers
fiscal_years 1—n fiscal_year_snapshots               import_batches 1—n import_rows
```

## Transisi status

```text
Tahun anggaran : terbuka → final(0) → revisi(1) → final(1) → revisi(2) → …
Baris warga    : menunggu → disetujui | dikembalikan → (perbaiki) → menunggu
Berkas impor   : divalidasi → dikonfirmasi | dibatalkan
```

- Tulis pada tabel ber-`fiscal_year_id` ditolak bila tahun berstatus `final` (layanan + pemicu).
- Finalisasi ditolak bila masih ada baris `menunggu`.
- Baris yang dibuat `operator_bpbd`/`admin_bpbd` langsung `disetujui`.
- Membuka tahun baru menyalin `hazard_zones`, `resident_records` aktif yang disetujui,
  `officer_records`, `equipment`, `logistics_stock`; tidak menyalin kejadian dan korban.
  `age_group` dihitung ulang terhadap tanggal acuan tahun baru.

## Visibilitas (ditegakkan di server)

| Data | Pendata kelurahan | Operator BPBD | Admin BPBD | Peran lain |
|---|---|---|---|---|
| Daftar warga kelurahannya | ya | ya | ya | tidak |
| Daftar warga kelurahan lain | tidak | ya | ya | tidak |
| NIK/KK utuh | layar rincian kelurahannya, tercatat audit | layar rincian, ekspor resmi | ya | tidak |
| Petugas, kejadian, korban | tidak | ya | ya | tidak |
| Rekapitulasi 5.A.3/5.A.4/5.A.6 | kelurahannya | ya | ya | angka saja |
| Penelusuran angka ke rincian | kelurahannya | ya | ya | tidak |
