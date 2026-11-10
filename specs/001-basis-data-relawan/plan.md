# Implementation Plan: Basis Data Relawan e-Tangguh (MVP)

**Branch**: `claude/affectionate-edison-hu6uwc` | **Date**: 2026-11-10 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/001-basis-data-relawan/spec.md`

## Summary

Aplikasi web untuk BPBD Kota Banjarmasin: relawan mendaftar dan mengelola profil serta bukti
kompetensinya; admin BPBD memverifikasi, menelusuri relawan dalam galeri kartu beratribut,
membandingkan, dan menyusun tim; peta sebaran dan ekspor tersedia. Pendekatan teknis: monorepo
TypeScript berisi antarmuka React (Vite), API Fastify, dan paket bersama (skema + rumus atribut),
di atas PostgreSQL + PostGIS, dengan peta MapLibre memakai ubin PMTiles yang di-host sendiri.

## Technical Context

**Language/Version**: TypeScript pada Node.js LTS (server) dan peramban modern (antarmuka)

**Primary Dependencies**: React, Vite, React Router, TanStack Query, Tailwind CSS, Radix UI,
MapLibre GL JS, PMTiles; Fastify, Zod, Drizzle ORM, Argon2

**Storage**: PostgreSQL + PostGIS; berkas pada volume lokal di balik antarmuka penyimpanan

**Testing**: Vitest (unit), uji integrasi API terhadap PostgreSQL/PostGIS dalam kontainer,
Playwright + axe (ujung-ke-ujung dan aksesibilitas)

**Target Platform**: server Linux dengan Docker Compose pada infrastruktur pemerintah di
Indonesia; peramban ponsel dan desktop

**Project Type**: aplikasi web (antarmuka + API)

**Performance Goals**: `GET /volunteers` p95 ≤ 500 ms pada 10.000 relawan; LCP `/relawan` ≤ 3
detik pada "Slow 4G"

**Constraints**: JavaScript awal rute kritis ≤ 250 KB gzip; WCAG 2.1 AA; data pribadi tidak
di-cache persisten di perangkat; tanpa pengiriman data pribadi ke pihak ketiga

**Scale/Scope**: ≤ 10.000 relawan, ≤ 200 pengguna bersamaan (asumsi A1); 13 rute antarmuka, 16
tabel

Tidak ada NEEDS CLARIFICATION teknis; keputusan dan alternatif ada di [research.md](./research.md).

## Constitution Check

Dievaluasi terhadap konstitusi v1.1.1, sebelum riset dan diulang setelah desain.

| Prinsip | Pemenuhan dalam rancangan | Status |
|---|---|---|
| I. Perlindungan data pribadi | enkripsi kolom AES-256-GCM + indeks buta NIK (R3); tabel `consents` berversi per tujuan; `data_requests`; status `dianonimkan`; NIK tersamar (`nik_last4`); data sintetis untuk seed | LULUS |
| II. Akses berbasis peran dan audit | matriks peran per titik akhir di `contracts/api.md`, default ditolak; `audit_log` hanya-tambah dengan hak basis data terbatas (R9); rahasia lewat `.env` | LULUS |
| III. Data terverifikasi, atribut berbasis bukti | status verifikasi profil/bukti/penugasan; rumus murni berversi dengan `breakdown` dan larangan masukan diskriminatif (`contracts/attribute-formula.md`); koreksi atribut; `nik_hash` unik | LULUS |
| IV. Visual fungsional dan aksesibel | galeri ⇄ tabel setara; radar + tabel; reduced-motion; anggaran kinerja diuji CI; desain orisinal (`contracts/ui.md`) | LULUS |
| V. Andal saat darurat | alur kritis = cari relawan + lihat kontak (US3) dengan perilaku gangguan terdefinisi; ubin peta di-host sendiri; cadangan + uji pemulihan (R11); ekspor CSV/XLSX/PDF; migrasi berversi | LULUS |
| VI. Sederhana, teruji, dapat dirawat | satu bahasa, satu basis data, tanpa antrean/cache/layanan terkelola; uji wajib untuk akses, rumus, verifikasi; dokumentasi operasi bahasa Indonesia | LULUS |
| Batasan tumpukan teknologi | React + Vite, PostgreSQL + PostGIS, MapLibre; SRID 4326; kueri spasial di basis data; peta publik agregat | LULUS |

Gerbang: tidak ada pelanggaran. Pemeriksaan ulang pasca-desain: tetap LULUS.

Hal yang dibawa ke implementasi sebagai syarat rilis, bukan pelanggaran: konfirmasi asumsi A1-A6,
persetujuan BPBD atas ambang rumus atribut, sumber batas wilayah resmi, lokasi hosting.

## Project Structure

### Documentation (this feature)

```text
specs/001-basis-data-relawan/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── api.md
│   ├── attribute-formula.md
│   └── ui.md
└── tasks.md            # dibuat oleh /speckit-tasks
```

### Source Code (repository root)

```text
apps/
├── web/                      # React + Vite
│   ├── src/
│   │   ├── routes/           # satu berkas per rute di contracts/ui.md
│   │   ├── features/         # volunteers, teams, review, organizations, map, admin
│   │   ├── components/       # VolunteerCard, RadarChart, DataTable, …
│   │   └── lib/              # klien API, sesi
│   └── tests/                # Playwright (e2e + axe)
└── api/                      # Fastify
    ├── src/
    │   ├── modules/          # auth, volunteers, evidences, review, teams,
    │   │                     # organizations, map, exports, admin
    │   ├── policies/         # matriks izin per peran
    │   ├── audit/            # penulisan audit_log dalam transaksi
    │   ├── crypto/           # enkripsi kolom, indeks buta
    │   ├── storage/          # antarmuka penyimpanan berkas
    │   └── db/               # skema Drizzle, migrasi, seed
    └── tests/                # integrasi terhadap PostGIS
packages/
└── shared/                   # skema Zod, tipe, rumus atribut + uji unit
infra/
├── docker-compose.yml        # proxy TLS, api, web statis, db
├── backup/                   # skrip cadangan dan pemulihan
└── tiles/                    # petunjuk pembuatan PMTiles dan gaya peta
docs/                         # panduan instalasi dan operasi (bahasa Indonesia)
```

**Structure Decision**: monorepo pnpm dengan dua aplikasi dan satu paket bersama. Paket bersama
diperlukan agar rumus atribut dan skema validasi memiliki satu sumber kebenaran bagi server dan
antarmuka.

## Urutan Pengerjaan (masukan untuk /speckit-tasks)

1. **Fondasi**: monorepo, CI, Docker Compose, migrasi awal, autentikasi sesi, kebijakan peran,
   jejak audit, enkripsi kolom, data rujukan dan seed sintetis.
2. **US1** pendaftaran, profil, persetujuan, unggah bukti.
3. **US2** antrean verifikasi + rumus atribut dan penghitungan ulang.
4. **US3** galeri kartu, tabel, filter, detail, perbandingan, tim, ekspor tim. Titik ini adalah
   MVP yang dapat dipakai.
5. **US4** organisasi dan keanggotaan.
6. **US5** peta (PMTiles, agregat publik, titik untuk admin, pencarian terdekat).
7. **US6** dasbor, ekspor umum, penelusur jejak audit.
8. **US7** ketersediaan relawan; permintaan data dan anonimisasi terjadwal.
9. **Pengerasan**: anggaran kinerja, aksesibilitas, uji pemulihan cadangan, dokumentasi operasi.

## Complexity Tracking

| Penyimpangan dari yang paling sederhana | Mengapa diperlukan | Alternatif lebih sederhana yang ditolak |
|---|---|---|
| Monorepo tiga paket | rumus atribut dan skema dipakai server dan antarmuka | dua proyek terpisah menduplikasi rumus, berisiko hasil berbeda (Prinsip III) |
| Enkripsi tingkat kolom di aplikasi | NIK dan data kesehatan terlindung pada cadangan dan dump | hanya enkripsi disk tidak memenuhi Prinsip I |
| Ubin peta di-host sendiri | bebas ketergantungan pihak ketiga saat darurat | penyedia ubin eksternal menambah titik gagal dan arus data keluar |
