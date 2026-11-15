# Contract: REST API `/api/v1`

JSON, UTF-8. Autentikasi cookie sesi; permintaan pengubah data wajib menyertakan token CSRF.
Default ditolak: titik akhir tanpa peran yang cocok mengembalikan 403. Skema permintaan/respons
didefinisikan dengan Zod di `packages/shared` dan diekspor sebagai OpenAPI saat implementasi.

Peran: P = publik, R = relawan, O = pengurus, A = admin_bpbd, S = super_admin.
Kolom "Audit" = tindakan dicatat di `audit_log`.

## Autentikasi

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| POST | /auth/register | P | ya | membuat user + relawan draf + persetujuan dasar |
| POST | /auth/login | P | ya | laju dibatasi |
| POST | /auth/logout | R O A S | ya | |
| POST | /auth/password-reset/request | P | ya | kirim tautan ke email; respons sama untuk akun ada/tidak ada |
| POST | /auth/password-reset/confirm | P | ya | token sekali pakai, kedaluwarsa |
| GET | /auth/me | R O A S | | profil sesi dan peran |

## Relawan (diri sendiri)

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /me/volunteer | R | | profil lengkap milik sendiri |
| PATCH | /me/volunteer | R | ya | ubah profil; ubah identitas → status `diajukan` |
| POST | /me/volunteer/submit | R | ya | draf/ditolak → diajukan |
| PUT | /me/availability | R | ya | |
| GET/POST | /me/evidences | R | ya (POST) | unggah bukti (multipart) |
| DELETE | /me/evidences/:id | R | ya | hanya yang belum terverifikasi |
| GET/POST | /me/deployments | R | ya (POST) | klaim penugasan |
| GET | /me/attributes | R | | nilai + rincian dasar perhitungan |
| POST | /me/attribute-corrections | R | ya | |
| GET/POST | /me/consents | R | ya (POST) | beri/tarik persetujuan per tujuan |
| POST | /me/data-requests | R | ya | hapus / salinan data |
| GET/POST | /me/memberships | R | ya (POST) | ajukan gabung organisasi |

## Penelusuran dan kartu (admin, pengurus terbatas)

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /volunteers | A S, O (anggota sendiri) | | hanya `terverifikasi`; filter `q`, `cluster`, `kecamatan`, `kelurahan`, `availability`, `organization`, `min_<atribut>`, `near=lon,lat&radius_m` (A S); `sort`, paginasi kursor; mengembalikan bidang kartu saja |
| GET | /volunteers/:id | A S, O | | detail tanpa data sensitif |
| GET | /volunteers/:id/sensitive | A S | ya | NIK utuh, kesehatan, kontak darurat, alamat |
| GET | /volunteers/:id/attributes | A S, O | | nilai + rincian |
| GET | /volunteers/compare?ids= | A S | | maksimum 3 |
| GET | /files/:id | pemilik, A S | ya (bukti) | berkas dialirkan setelah otorisasi |

## Verifikasi

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /admin/review-queue | A S | | profil, bukti, penugasan berstatus `diajukan` |
| POST | /admin/volunteers/:id/verify | A S | ya | |
| POST | /admin/volunteers/:id/reject | A S | ya | `reason` wajib |
| POST | /admin/evidences/:id/verify \| reject | A S | ya | memicu hitung ulang atribut |
| POST | /admin/deployments | A S | ya | catat penugasan langsung terverifikasi |
| POST | /admin/deployments/:id/verify \| reject | A S | ya | |
| POST | /admin/attribute-corrections/:id/resolve | A S | ya | |
| POST | /admin/data-requests/:id/resolve | A S | ya | |

## Tim

| Metode | Jalur | Peran | Audit |
|---|---|---|---|
| GET/POST | /teams | A S | ya (POST) |
| GET/PATCH/DELETE | /teams/:id | A S | ya (ubah/hapus) |
| PUT/DELETE | /teams/:id/members/:volunteerId | A S | ya |
| GET | /teams/:id/export?format=csv\|xlsx\|pdf | A S | ya |

## Organisasi

| Metode | Jalur | Peran | Audit |
|---|---|---|---|
| GET | /organizations | R O A S | |
| POST | /organizations | R (mengajukan) | ya |
| PATCH | /organizations/:id | O (miliknya), A S | ya |
| POST | /organizations/:id/verify \| reject | A S | ya |
| GET | /organizations/:id/members | O (miliknya), A S | |
| POST | /organizations/:id/members/:membershipId/approve \| reject | O (miliknya), A S | ya |

## Peta, statistik, ekspor

| Metode | Jalur | Peran | Audit | Keterangan |
|---|---|---|---|---|
| GET | /public/stats | P | | agregat; sel < 5 disembunyikan |
| GET | /public/regions.geojson | P | | batas wilayah + jumlah agregat |
| GET | /map/volunteers | A S | ya | titik perorangan (GeoJSON), mengikuti filter |
| GET | /stats/dashboard | A S | | |
| GET | /exports/volunteers?format=&filter… | A S | ya | bidang sensitif hanya dengan `include_sensitive=1` (S) |

## Administrasi

| Metode | Jalur | Peran | Audit |
|---|---|---|---|
| GET/POST/PATCH | /admin/users | S | ya |
| POST | /admin/users/:id/reset-password | A S | ya |
| GET/PUT | /admin/settings | S | ya |
| POST | /admin/volunteers/:id/guardian-consent/verify | A S | ya |
| GET/POST/PATCH | /admin/skill-clusters | S | ya |
| GET/POST | /admin/formula-versions | S | ya |
| GET | /admin/audit-log | S | ya |

## Galat

`{ "error": { "code": "…", "message": "pesan bahasa Indonesia", "fields": { … } } }` dengan
status 400 validasi, 401 belum masuk, 403 tidak berwenang, 404, 409 konflik (mis. NIK terdaftar,
tanpa menyebut pemilik), 413 berkas terlalu besar, 429 laju terlampaui.

## Jaminan kontrak (diuji otomatis)

- Tidak ada respons selain `/me/volunteer` dan `/volunteers/:id/sensitive` yang memuat NIK utuh,
  data kesehatan, kontak darurat, atau alamat rinci.
- Setiap baris bertanda "Audit: ya" menghasilkan tepat satu entri `audit_log` per permintaan
  yang berhasil.
- Setiap jalur diuji untuk setiap peran (matriks izin), termasuk akses objek milik pihak lain.
