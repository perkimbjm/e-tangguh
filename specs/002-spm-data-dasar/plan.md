# Implementation Plan: Data Dasar SPM Sub-Urusan Bencana (Form 5.A)

**Branch**: `claude/affectionate-edison-hu6uwc` | **Date**: 2026-11-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-spm-data-dasar/spec.md`

## Summary

Modul data dasar SPM: pendataan warga kawasan rawan bencana per kelurahan (isian dan impor XLSX
tervalidasi dengan persetujuan BPBD), petugas, kejadian bencana dan korban, inventaris, serta
rekapitulasi Form 5.A.3/5.A.4/5.A.6 yang dihitung otomatis dan dapat ditelusuri, dengan ekspor
XLSX/PDF sesuai formulir resmi dan penguncian per tahun anggaran. Pendekatan teknis: modul `spm`
pada monorepo fitur 001 (React + Vite, NestJS, PostgreSQL + PostGIS); satu catatan orang
bersama; definisi formulir dan definisi sel rekap sebagai data berversi yang menggerakkan
validasi, perhitungan, penelusuran, dan ekspor dari satu sumber.

Arah perancangan yang diminta (lebih mudah, cepat, otomatis, efisien, efektif) diwujudkan
sebagai berikut:

| Arah | Wujud dalam rancangan |
|---|---|
| Lebih mudah | templat unduhan ber-validasi; padanan nama wilayah otomatis; pratinjau sebelum simpan; galat menyebut baris dan kolom |
| Lebih cepat | impor sinkron beraliran (1.000 baris dalam detik); persetujuan per berkas/kelurahan; rekap dihitung saat diminta |
| Lebih otomatis | kelompok umur, variasi kerawanan, status darurat, seluruh rekap, salin maju tahun anggaran, arsip saat finalisasi |
| Lebih efisien | data diri diketik sekali (`persons`); relawan menjadi petugas tanpa ketik ulang; tanpa antrean atau layanan baru |
| Lebih efektif | satu definisi untuk angka dan penelusurannya; ringkasan kelengkapan per kelurahan; laporan lama dapat direproduksi |

## Technical Context

**Language/Version**: TypeScript pada Node.js LTS (server) dan peramban modern (antarmuka)

**Primary Dependencies**: yang sudah ditetapkan fitur 001 (React, Vite, TanStack Query, NestJS,
Zod, Drizzle ORM); tambahan: ExcelJS (baca/tulis XLSX), pdfmake (PDF), ekstensi `pg_trgm`

**Storage**: PostgreSQL + PostGIS; arsip finalisasi dan berkas impor pada penyimpanan berkas
fitur 001

**Testing**: Vitest (unit), integrasi terhadap PostgreSQL/PostGIS dalam kontainer, Playwright
(ujung-ke-ujung), uji "berkas emas" kepala formulir, uji beban rekap

**Target Platform**: server Linux milik/ditunjuk Pemko Banjarmasin (Diskominfo) dengan Docker
Compose; peramban desktop dan ponsel

**Project Type**: aplikasi web (antarmuka + API), modul tambahan pada monorepo yang sama

**Performance Goals**: validasi impor 1.000 baris ≤ 15 detik; rekap seluruh kota ≤ 5 detik pada
200.000 warga; daftar warga per kelurahan p95 ≤ 500 ms

**Constraints**: data perorangan hanya untuk peran BPBD berwenang; tulis ditolak pada tahun
final; ekspor mengikuti susunan kolom resmi; data uji sintetis; tanpa layanan pihak ketiga

**Scale/Scope**: hingga 200.000 warga per tahun anggaran (perkiraan batas atas), 52 kelurahan,
≤ 100 akun pendata/operator; 12 formulir, 18 tabel baru, 2 peran baru

Tidak ada NEEDS CLARIFICATION teknis; keputusan ada di [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Dievaluasi terhadap konstitusi v1.2.0; aturan batas 400 baris per berkas kode (v1.3.0) dipenuhi
lewat pemecahan berkas pada `tasks.md` dan pemeriksaan `max-lines` di CI.

| Prinsip | Pemenuhan dalam rancangan | Status |
|---|---|---|
| I. Perlindungan data pribadi | dasar pemrosesan = kewenangan BPBD, sumber data tercatat per baris; NIK, KK, alamat, jenis kebutuhan khusus terenkripsi per kolom; daftar perorangan terbatas peran; NIK/KK tersamar di daftar; pembersihan data mentah impor ≤ 7 hari; jalur pembetulan (`data_corrections`) | LULUS dengan catatan (lihat Complexity Tracking) |
| II. Akses berbasis peran dan audit | matriks peran per titik akhir, pendata terikat satu kelurahan, default ditolak; audit pada semua tulis, impor, ekspor, finalisasi, pembukaan rincian | LULUS |
| III. Data terverifikasi | satu orang per NIK (`persons`), penggabungan catatan ganda; persetujuan BPBD atas data kelurahan | LULUS |
| IV. Visual fungsional dan aksesibel | layar tabel sebagai tampilan utama; pesan galat teks; mengikuti aturan aksesibilitas fitur 001 | LULUS |
| V. Andal saat darurat | alur kritis = mencatat kejadian dan korban serta mengekspor daftar; tanpa ketergantungan layanan luar; arsip finalisasi tersimpan sebagai berkas; migrasi berversi | LULUS |
| VI. Sederhana, teruji, dapat dirawat | tanpa antrean, tanpa tabel rekap tersimpan, tanpa layanan baru; satu mesin ekspor; uji wajib untuk validasi, rekap, akses, penguncian | LULUS |
| VII. Format dan ketertelusuran SPM | data terikat tahun anggaran dan terkunci saat final; revisi bernomor dengan arsip; formulir dari `form_definitions` berversi; rekap dihitung dan dapat ditelusuri per sel; impor tervalidasi dengan laporan galat | LULUS |
| Batasan tumpukan teknologi | React + Vite, PostgreSQL + PostGIS, NestJS; kueri di basis data; data uji sintetis | LULUS |

Gerbang: lulus dengan satu penyimpangan beralasan yang telah disetujui pemilik proyek. Pemeriksaan ulang pasca-desain: tidak berubah.

Syarat rilis yang dibawa ke implementasi: konfirmasi dasar hukum pemrosesan data warga (ditunda
pemilik proyek, wajib sebelum data nyata dimasukkan), penempatan jumlah relawan pada Form 5.A.4,
kepastian format formulir yang berlaku, dan perkiraan jumlah warga di kawasan rawan. Sudah
terkonfirmasi 2026-11-15: tafsir kolom aparatur Form 5.A.4 dan judul Form 5.A.9.

## Project Structure

### Documentation (this feature)

```text
specs/002-spm-data-dasar/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   ├── forms.md
│   └── import.md
├── checklists/requirements.md
└── tasks.md             # dibuat oleh /speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── api/src/modules/
│   ├── persons/              # persons, families, penggabungan (dipakai juga modul relawan)
│   └── spm/
│       ├── fiscal-years/     # buka, salin maju, finalisasi, revisi, arsip
│       ├── hazard-zones/
│       ├── residents/        # isian, persetujuan, kelengkapan
│       ├── imports/          # baca XLSX, validasi, pratinjau, konfirmasi
│       ├── officers/
│       ├── events/           # kejadian, warga terdampak, petugas aktif
│       ├── inventory/        # peralatan, logistik
│       ├── recap/            # definisi sel → agregat dan penelusuran
│       └── exports/          # mesin XLSX/PDF dari definisi formulir
├── api/test/spm/             # integrasi, berkas emas, beban
└── web/src/features/spm/     # layar pendataan, impor, persetujuan, rekap, ekspor
packages/shared/src/spm/
├── forms/                    # definisi Form 5.A.1-5.A.12 (berversi)
├── validation/               # skema Zod dan kode galat impor
└── recap/                    # definisi sel rekap
tools/spm-fixtures/           # pembangkit lembar kerja dan data sintetis
```

**Structure Decision**: modul `spm` di dalam aplikasi yang sama dengan fitur 001, bukan layanan
terpisah. Modul `persons` dinaikkan menjadi modul bersama. Definisi formulir, validasi, dan sel
rekap berada di `packages/shared` agar server dan antarmuka memakai sumber yang sama.

## Urutan Pengerjaan (masukan untuk /speckit-tasks)

1. **Fondasi bersama**: `persons`/`families` dan penyelarasan `volunteers`; peran baru dan
   cakupan kelurahan; `fiscal_years` beserta penguncian; `hazard_types`, `hazard_zones`;
   `form_definitions`. Bergantung pada fondasi fitur 001 (autentikasi, audit, wilayah, berkas).
2. **US1** isian warga, impor 5.A.1/5.A.2, persetujuan, templat, ringkasan kelengkapan.
3. **US2** definisi sel rekap, layar rekap dan penelusuran, mesin ekspor XLSX/PDF. Titik ini
   adalah MVP SPM: Form 5.A.1 sampai 5.A.4 dapat dilaporkan.
4. **US3** petugas, impor 5.A.5, pilih dari relawan; melengkapi 5.A.4 dan 5.A.6.
5. **US4** kejadian, warga terdampak, status korban, petugas aktif.
6. **US5** peralatan dan stok logistik.
7. **US6** finalisasi, arsip, revisi, salin maju.
8. **Pengerasan**: uji beban, berkas emas seluruh formulir, dokumentasi operator bahasa
   Indonesia.

Urutan lintas fitur yang disarankan: fondasi 001 → fondasi bersama 002 → US1-US2 fitur 002 →
sisa fitur 001 dan 002 sesuai prioritas BPBD, karena pelaporan SPM memiliki tenggat tahunan.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Penanda `is_poor`, `has_special_needs`, `age_group`, status korban tidak dienkripsi per kolom (Prinsip I mewajibkan data sensitif dienkripsi saat disimpan) | Form 5.A.4 dan 5.A.6 menjumlahkan penanda ini atas hingga 200.000 baris; nilai terenkripsi per kolom tidak dapat dijumlahkan di basis data | Mendekripsi seluruh baris di aplikasi tiap rekap melampaui target 5 detik dan memperluas paparan data. Mitigasi: enkripsi volume basis data dan cadangan, akses terbatas peran, jenis kebutuhan khusus tetap terenkripsi per kolom. Disetujui pemilik proyek pada 2026-11-15, terbatas pada fitur ini |
| Definisi formulir dan sel rekap sebagai data berversi, bukan kode langsung | Prinsip VII mewajibkan rujukan berversi dan penelusuran per sel | Kueri rekap yang ditulis tangan per formulir akan membuat angka dan penelusuran menyimpang, serta menuntut perubahan kode tiap format berubah |
| Tabel antara impor (`import_batches`, `import_rows`) | pratinjau, laporan galat, dan idempotensi tanpa menyentuh data utama | Validasi langsung ke tabel utama tidak memberi pratinjau dan menyulitkan pembatalan |
