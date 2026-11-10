# Data Model: Basis Data Relawan e-Tangguh (MVP)

PostgreSQL + PostGIS. Semua tabel memiliki `id uuid`, `created_at`, `updated_at` kecuali
disebutkan lain. Kolom bertanda 🔒 dienkripsi di aplikasi (AES-256-GCM, lihat research R3).

## Entitas

### users

| Kolom | Tipe | Aturan |
|---|---|---|
| email | citext, unik, nullable | minimal salah satu dari email/phone terisi |
| phone | text, unik, nullable | format E.164 |
| password_hash | text | Argon2id |
| role | enum `relawan`, `pengurus`, `admin_bpbd`, `super_admin` | default `relawan` |
| is_active | boolean | |
| last_login_at | timestamptz | |

### sessions

`id` (token acak, di-hash), `user_id`, `expires_at`, `ip`, `user_agent`.

### volunteers (relawan)

| Kolom | Tipe | Aturan |
|---|---|---|
| user_id | uuid, unik → users | |
| full_name | text | wajib |
| nik_enc 🔒 | bytea | 16 digit, tervalidasi |
| nik_hash | bytea, unik | HMAC-SHA-256, untuk cegah duplikat |
| nik_last4 | char(4) | untuk tampilan tersamar |
| birth_date | date | usia ≥ 18 (asumsi A3) |
| gender | enum | tidak dipakai dalam atribut |
| photo_file_id | uuid → files | |
| kelurahan_id | uuid → regions, nullable | null bila luar kota |
| outside_city | boolean | |
| address_enc 🔒 | bytea | alamat rinci |
| location | geography(Point,4326), nullable | hanya dengan persetujuan lokasi |
| blood_type_enc 🔒 | bytea, nullable | opsional |
| health_notes_enc 🔒 | bytea, nullable | opsional |
| emergency_contact_enc 🔒 | bytea | nama, hubungan, telepon |
| primary_cluster_id | uuid → skill_clusters | "posisi" utama pada kartu |
| availability | enum `siaga`, `terbatas`, `tidak_tersedia` | default `tidak_tersedia` |
| availability_updated_at | timestamptz | |
| status | enum `draf`, `diajukan`, `terverifikasi`, `ditolak`, `nonaktif`, `dianonimkan` | |
| status_reason | text | wajib saat `ditolak` |
| joined_at | date | awal masa bakti (diverifikasi admin) |
| deactivated_at | timestamptz | dasar masa simpan |
| enc_key_version | smallint | untuk rotasi kunci |

Indeks: GiST pada `location`; btree pada `(status, primary_cluster_id, availability)`,
`kelurahan_id`; trigram pada `full_name`.

### volunteer_clusters

`volunteer_id`, `cluster_id`, unik berpasangan. Klaster keahlian tambahan.

### skill_clusters

`code` unik, `name`, `icon`, `is_active`. Data rujukan (asumsi A4).

### consents

`volunteer_id`, `purpose` enum (`pemrosesan_dasar`, `tampil_lintas_organisasi`, `lokasi_titik`,
`data_kesehatan`), `document_version`, `granted_at`, `withdrawn_at`, `ip`. Hanya-tambah; penarikan
mengisi `withdrawn_at`.

### evidences (bukti kompetensi)

| Kolom | Tipe | Aturan |
|---|---|---|
| volunteer_id | uuid | |
| type | enum `sertifikat`, `pelatihan` | |
| title | text | |
| issuer | text | |
| cluster_id | uuid → skill_clusters, nullable | |
| level | enum `dasar`, `lanjutan`, `ahli` | untuk sertifikat |
| hours | integer, nullable | jam pelatihan |
| issued_at | date | tidak boleh di masa depan |
| expires_at | date, nullable | setelah lewat tidak dihitung |
| file_id | uuid → files | wajib |
| status | enum `diajukan`, `terverifikasi`, `ditolak` | |
| verified_by, verified_at, status_reason | | |

### deployments (penugasan)

`volunteer_id`, `event_name`, `disaster_type`, `role` enum (`anggota`, `koordinator`),
`started_at`, `ended_at`, `days` (turunan), `source` enum (`admin`, `klaim_relawan`), `status`
seperti evidences, `file_id` nullable. Klaim relawan hanya dihitung setelah terverifikasi.

### organizations

`name`, `type`, `legal_number`, `kelurahan_id`, `contact_phone`, `contact_email`, `status`
(`diajukan`, `terverifikasi`, `ditolak`, `nonaktif`).

### memberships

`volunteer_id`, `organization_id`, `role` enum (`anggota`, `pengurus`), `status` (`diajukan`,
`aktif`, `ditolak`, `keluar`), `joined_at`. Unik `(volunteer_id, organization_id)`.

### regions (wilayah)

`code` (kode wilayah resmi), `name`, `level` enum (`kecamatan`, `kelurahan`), `parent_id`,
`geom geometry(MultiPolygon,4326)`. Indeks GiST pada `geom`.

### formula_versions

`version` unik, `weights jsonb`, `description`, `effective_from`, `created_by`. Tidak diubah
setelah berlaku; perubahan = versi baru.

### volunteer_attributes

`volunteer_id` unik, `formula_version`, `kmp`, `lat`, `png`, `sia`, `sen`, `kep`, `overall`
(smallint 1-99), `breakdown jsonb` (rincian penyusun per atribut, merujuk id bukti/penugasan),
`computed_at`. Indeks pada `overall` dan tiap atribut untuk filter rentang.

### attribute_corrections

`volunteer_id`, `attribute`, `message`, `status` (`diajukan`, `diterima`, `ditolak`),
`resolved_by`, `resolution_note`.

### teams, team_members

`teams`: `name`, `purpose`, `created_by`, `status` (`draf`, `final`).
`team_members`: `team_id`, `volunteer_id`, `slot_cluster_id`, `note`. Unik berpasangan.

### files

`owner_user_id`, `kind` enum (`foto`, `bukti`), `mime`, `size`, `storage_key`, `sha256`.

### data_requests

`volunteer_id`, `type` enum (`hapus`, `tarik_persetujuan`, `salinan_data`), `status`,
`handled_by`, `handled_at`.

### audit_log (hanya-tambah)

`id bigserial`, `at`, `actor_user_id`, `actor_role`, `action`, `entity`, `entity_id`,
`ip`, `user_agent`, `detail jsonb` (tanpa nilai data sensitif). Tanpa `updated_at`. Peran
basis data aplikasi hanya `INSERT`/`SELECT`; pemicu menolak `UPDATE`/`DELETE`.

## Relasi ringkas

```text
users 1—1 volunteers 1—n evidences / deployments / consents / memberships
volunteers n—n skill_clusters (volunteer_clusters)   volunteers n—1 regions (kelurahan)
volunteers 1—1 volunteer_attributes n—1 formula_versions
organizations 1—n memberships        teams 1—n team_members n—1 volunteers
regions (kelurahan) n—1 regions (kecamatan)
```

## Transisi status

```text
Relawan : draf → diajukan → terverifikasi → nonaktif → dianonimkan
                    └→ ditolak → (perbaiki) → diajukan
Bukti   : diajukan → terverifikasi | ditolak        (kedaluwarsa = turunan dari expires_at)
```

- Hanya `admin_bpbd`/`super_admin` yang memindahkan ke `terverifikasi`/`ditolak`.
- Perubahan NIK, nama, atau tanggal lahir oleh relawan terverifikasi mengembalikan status ke
  `diajukan`.
- `dianonimkan`: kolom 🔒, nama, foto, kontak, lokasi dihapus; `nik_hash` dihapus; baris agregat
  dan penugasan dipertahankan tanpa identitas.

## Aturan visibilitas data (ditegakkan di server)

| Data | Relawan (sendiri) | Pengurus (anggotanya) | Admin BPBD | Publik |
|---|---|---|---|---|
| Nama, foto, klaster, atribut, ketersediaan | ya | ya, bila ada persetujuan lintas organisasi | ya | tidak |
| Telepon/email | ya | ya | ya | tidak |
| NIK utuh | ya | tidak | hanya layar verifikasi, tercatat audit | tidak |
| Data kesehatan, kontak darurat, alamat | ya | tidak | ya, tercatat audit | tidak |
| Titik lokasi | ya | tidak | ya | tidak |
| Agregat per wilayah (≥ 5) | ya | ya | ya | ya |
