# PLAN — SiperPAD

> Sistem Perhitungan dan Rekapitulasi PAD — Kawasan Wisata Lasiana & Kampung Seni  
> Dinas Pariwisata dan Ekonomi Kreatif Provinsi NTT  
> Referensi: *Draft Rancangan Aktualisasi — Anna Maria Elisawati Mogi Paja, S.Kom (2026)*

---

## 1. Ringkasan Dokumen Referensi

**Judul:** Optimalisasi Proses Perhitungan dan Rekapitulasi Retribusi PAD melalui SiperPAD pada Kawasan Wisata (Lasiana dan Kampung Seni)

**Isu prioritas (APKL skor 20):** Belum optimalnya proses perhitungan dan rekapitulasi retribusi PAD — masih manual via Excel (multi-file, rumus rentan rusak, tidak terintegrasi, tanpa dashboard real-time).

**Akar masalah:** Belum tersedia sistem digital yang menghitung & merekap PAD otomatis; data tersebar di banyak file Excel; belum ada basis data terintegrasi dan dashboard.

**Gagasan pemecahan:** Bangun SiperPAD — sistem digital perhitungan & rekapitulasi PAD otomatis dengan basis data terintegrasi, perhitungan capaian otomatis, dan dashboard monitoring real-time untuk pimpinan.

**Rencana kegiatan (Tabel 2 dokumen):**
1. Persiapan & konsultasi mentor
2. Analisis kebutuhan sistem (user roles, fitur, infrastruktur)
3. Perancangan sistem (arsitektur DB, alur kerja, antarmuka)
4. Uji coba sistem (fungsional + simulasi data riil + bug fixing)
5. Penyusunan buku panduan / SOP
6. Sosialisasi penggunaan sistem
7. Monitoring, evaluasi & pelaporan

**Visi terkait:** NTT Maju, Sehat, Cerdas, Sejahtera dan Berkelanjutan — Misi 1 (NTT Maju: infrastruktur digital) & Misi 5 (Berkelanjutan).

---

## 2. Tech Stack

| Lapisan | Teknologi |
|---------|-----------|
| Framework | Nuxt 4 (file-based routing `app/pages/`) |
| UI | Vuetify 3 (`v-table` manual, `v-pagination`, `v-select`), `@mdi/font` 7.4.47, `vue3-apexcharts` + `apexcharts` |
| Auth | `nuxt-auth-utils` — session cookie, `NUT_SESSION_PASSWORD` 32+ char |
| Database | Turso / libSQL (`@libsql/client` 0.18), migrasi SQL `server/database/migrations/*.sql` |
| Storage/Backup | Dropbox SDK 10.47 (`/siperpad`, token saat ini kosong) |
| Export | `xlsx` (SheetJS flat) + `exceljs` 4.4 (XLSX mingguan ber-styling), `pdfkit` (PDF portrait A4), CSV zero-dep |
| Runtime | Nitro server routes `server/api/*.ts` (`[route].[method].ts`) |

Kunci `runtimeConfig`: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `DROPBOX_*`, `NUT_SESSION_PASSWORD`.

---

## 3. Apa yang Sudah Dibangun

### 3.1 Database — `server/database/migrations/001_init.sql`

| Tabel | Kolom kunci | Status |
|-------|-------------|--------|
| `users` | `id, nama, nip, email, role(admin/verifikator/kepala), aktif` | ✅ seeded 3 user (`admin@mail.com`/`verif@mail.com`/`kepala@mail.com` / `123456`) |
| `kawasan` | `id, kode(UNIQUE), nama, urutan, aktif` | ✅ seeded 2 kawasan (A: Kampung Seni, B: Pantai Lasiana) |
| `jenis_retribusi` | `id, kawasan_id, parent_id(self-ref), kode, nama, level, urutan, aktif` — unique `(kawasan_id, parent_id, nama)` | ✅ seeded ~35 jenis hierarkis |
| `target` | `jenis_retribusi_id, tahun, nilai` — unique `(jenis_retribusi_id, tahun)` | ✅ seeded 2026 + CRUD `server/api/target*` + `app/pages/master/target.vue` |
| `realisasi` | `jenis_retribusi_id, tanggal, jumlah, catatan, batch_id, status(draft/diajukan/disetujui/ditolak), created_by` | ✅ API + UI (`server/api/realisasi*` termasuk `verifikasi`, `app/pages/pad.vue` + `verifikasi.vue`) |
| `laporan_batch` | `kawasan_id, periode_type(mingguan/bulanan/semester/tahunan), periode_start/end, tahun, status, diajukan_oleh, verified_by` | ✅ API `server/api/laporan/batch*` + tab di `verifikasi.vue` |
| `audit_log` | `user_id, aksi, entitas, entitas_id, before/after` | ✅ API `server/api/audit-log.get.ts` + tab Audit di `verifikasi.vue` |
| `settings` | bukan tabel — file `docs/SOP_SIPERPAD.md`, API `auth/change-password`, `sistem-info`, `sync/dropbox` | ✅ |
| `_migrations` | tracking migrasi | ✅ |

Seed: `server/database/seed.ts`, migrasi runner `server/utils/db.ts` + endpoint `POST /api/migrate`.

### 3.2 Auth & Layout

| Fitur | File | Status |
|-------|------|--------|
| Login | `app/pages/login.vue` + `server/api/auth/login.post.ts` | ✅ |
| Logout | `server/api/auth/logout.post.ts` | ✅ |
| Session | `server/api/auth/me.get.ts`, middleware `auth` | ✅ |
| Layout + dark mode | `app/layouts/default.vue`, `app/composables/useDarkMode.ts` | ✅ |
| Navigasi | Sidebar — Dashboard, Data PAD (admin), Verifikasi (admin/verifikator/kepala), **MASTER DATA** group (Kawasan/Jenis/Target), Laporan, Pengguna (admin), Pengaturan (semua) | ✅ |

### 3.3 Master Data — Selesai

| Halaman | File | Fitur | Status |
|---------|------|-------|--------|
| **Kawasan Wisata** | `app/pages/kawasan-wisata.vue` | CRUD flat `v-table`, search, dialog tambah/edit, hapus guard FK, snackbar, admin-only write | ✅ |
| **Jenis Retribusi** | `app/pages/jenis-retribusi.vue` | CRUD flat `v-table`, filter kawasan, search, parent select, pagination client (`perPage 5/10/25/50`), info `from–to dari total`, soft delete (`aktif=0`), admin-only write | ✅ |
| API Kawasan | `server/api/kawasan.get.ts`, `kawasan.post.ts`, `kawasan/[id].get/put/delete.ts` | ✅ | ✅ |
| API Jenis Retribusi | `server/api/jenis-retribusi.get.ts`, `jenis-retribusi.post.ts`, `jenis-retribusi/[id].get/put/delete.ts` | level auto dari parent, unique guard, soft delete | ✅ |

Sidebar: group **MASTER DATA** (`Kawasan Wisata` `mdi-map-marker-multiple` + `Jenis Retribusi` `mdi-format-list-bulleted`).

Dihapus: `app/pages/master-data.vue` (placeholder).

### 3.4 Laporan, Rekap & Dashboard — Selesai (Fase 1 parsial)

| Fitur | File | Detail | Status |
|-------|------|--------|--------|
| Service rekap | `server/utils/rekap.ts` | `getRekapPerJenis`, `getTimeseries(bulanan/triwulan/tahunan)`, `getTotals` — dipakai rekap & export | ✅ |
| Rekap API | `server/api/laporan/rekap.get.ts` | `GET ?kawasan_id&tahun&scope` — auth semua role, return `perJenis/totals/timeseries` | ✅ |
| Export API | `server/api/laporan/export.get.ts` | `GET ?format=csv/xlsx/pdf&kawasan_id&tahun&bulan` — **auth admin+kepala only (403)**, CSV zero-dep, XLSX mingguan via `exceljs` (struktur persis referensi), PDF portrait A4 via `pdfkit` | ✅ — XLSX: judul merge A:K, header 2 baris + merge I-IV, indent hierarki, freeze, TOTAL kuning, % `0.00%`, ringkasan 1/2/3 + catatan |
| Chart | `app/components/SiperpadChart.vue` | Wrapper `vue3-apexcharts` client-only dynamic import, multi-series, export PNG | ✅ |
| Dashboard | `app/pages/index.vue` | Filter kawasan+tahun+scope dropdown, cards Total Target/Realisasi/Capaian/Selisih, `SiperpadChart` multi-series + Ekspor PNG, health cards | ✅ |
| Laporan | `app/pages/laporan.vue` | Filter kawasan+tahun+**bulan**+search, summary cards, tabel rekap flat + pagination 5/10/25/50, export buttons CSV/XLSX/PDF (admin+kepala, XLSX kirim `bulan`) | ✅ |

### 3.5 Data PAD — Realisasi (Fase 2) — Selesai

| Fitur | File | Detail | Status |
|-------|------|--------|--------|
| Realisasi API | `server/api/realisasi.get.ts`, `realisasi.post.ts`, `realisasi/[id].get/put/delete.ts`, `realisasi/[id]/ajukan.post.ts` | Filter kawasan/jenis/status/tanggal, capaian vs target, guard `draft` only edit/delete, `ajukan` draft→diajukan, admin-only write | ✅ |
| Verifikasi realisasi | `server/api/realisasi/[id]/verifikasi.post.ts` | `diajukan → disetujui/ditolak` — role verifikator/kepala/admin, audit_log | ✅ |
| Target CRUD | `server/api/target.get.ts` (list+lookup), `target.post.ts`, `target/[id].delete.ts` | `GET ?tahun&kawasan_id` list, `POST` upsert `(jenis,tahun)`, `DELETE`, admin-only, detail lookup `?jenis_retribusi_id&tahun` | ✅ |
| Target page | `app/pages/master/target.vue` | Filter kawasan/tahun+search, tabel + pagination 5/10/25/50, dialog upsert, hapus, admin-only | ✅ |
| Target lookup | `server/api/target.get.ts` | `GET ?jenis_retribusi_id&tahun` → nilai target untuk preview capaian di pad/verifikasi | ✅ |
| Data PAD page | `app/pages/pad.vue` | Filter kawasan/jenis/status+search, tabel realisasi + capaian chip + pagination, dialog tambah/edit dengan preview target & capaian, ajukan & hapus draft | ✅ |

### 3.6 Fase 2 — Verifikasi, Batch, Pengguna & Audit — Selesai

| Fitur | File | Detail | Status |
|-------|------|--------|--------|
| Verifikasi page | `app/pages/verifikasi.vue` | Tabs: Realisasi Diajukan + Batch Laporan + Audit Trail; filter, paginasi, setujui/tolak, buat batch — role verifikator/kepala/admin | ✅ |
| Batch API | `server/api/laporan/batch.get/post.ts`, `batch/[id]/ajukan+verifikasi.post.ts` | `GET ?kawasan_id&status`, `POST` create draft, `ajukan` draft→diajukan (admin), `verifikasi` diajukan→disetujui/ditolak + audit | ✅ |
| Pengguna API | `server/api/users.get/post.ts`, `users/[id]/put/delete.ts` | List/create/update/soft-delete (aktif=0), scrypt hash, self-delete guard, admin-only | ✅ |
| Pengguna page | `app/pages/pengguna.vue` | Tabel + search + pagination, dialog tambah/edit (role/password/aktif), nonaktifkan guard self, admin-only | ✅ |
| Audit log API | `server/api/audit-log.get.ts` | `GET ?entitas&entitas_id&aksi&limit` join users, semua role read | ✅ |
| Audit viewer | Tab Audit di `verifikasi.vue` | Filter entitas/id, tabel at/user/aksi/entitas/before→after | ✅ |
| Navigasi | `app/layouts/default.vue` | Verifikasi untuk admin/verifikator/kepala; MASTER DATA tambah Target Tahunan (`mdi-bullseye-arrow`) + Pengaturan (`mdi-cog-outline`) | ✅ |

### 3.7 Fase 3 — Pengaturan, Dropbox & SOP — Selesai

| Fitur | File | Detail | Status |
|-------|------|--------|--------|
| Pengaturan page | `app/pages/settings.vue` | Ganti password (lama+baru+konfirmasi) + Info Sistem (counts, dropbox status) + Sinkron ke Dropbox (admin) + link SOP | ✅ |
| Ganti password API | `server/api/auth/change-password.post.ts` | Scrypt verify + hash, min 6 char, self only | ✅ |
| Info sistem API | `server/api/sistem-info.get.ts` | Counts users/kawasan/jenis/target/realisasi/batch/audit + dropbox ready + current user | ✅ |
| Dropbox sync API | `server/api/sync/dropbox.post.ts` | Admin-only; dump JSON → `DROPBOX_FOLDER/siperpad-backup-YYYY-MM-DD.json` via SDK `filesUpload` | ✅ |
| SOP | `docs/SOP_SIPERPAD.md` | Peran, alur, langkah operasional lengkap (input, target, verifikasi, laporan, pengguna, pengaturan), env & troubleshooting | ✅ |

---

## 4. Apa yang Belum Dibangun

| Halaman / Modul | File saat ini | Kondisi | Prioritas |
|-----------------|---------------|---------|-----------|
| **Dashboard** (`/`) | `app/pages/index.vue` | Filter kawasan+tahun+scope, cards, chart multi-series — selesai | ✅ |
| **Data PAD** (`/pad`) | `app/pages/pad.vue` | Filter + tabel realisasi + dialog + preview capaian — selesai | ✅ |
| **Laporan** (`/laporan`) | `app/pages/laporan.vue` | Rekap + export CSV/XLSX/PDF — selesai | ✅ |
| **Verifikasi** (`/verifikasi`) | `app/pages/verifikasi.vue` | Tabs realisasi diajukan + batch + audit — selesai | ✅ |
| **Pengguna** (`/pengguna`) | `app/pages/pengguna.vue` | CRUD + search + pagination — selesai | ✅ |
| **Pengaturan** (`/settings`) | `app/pages/settings.vue` | Ganti password + info sistem + sync Dropbox + SOP link — selesai | ✅ |
| **Realisasi CRUD** | `server/api/realisasi*` + `verifikasi` | Selesai — termasuk verifikasi diajukan→disetujui/ditolak + audit | ✅ |
| **Target per tahun** | `server/api/target*` + `app/pages/master/target.vue` | Selesai — list/upsert/delete per tahun & kawasan | ✅ |
| **Laporan batch flow** | `server/api/laporan/batch*` | Selesai — draft→diajukan→disetujui/ditolak + audit, UI tab Batch | ✅ |
| **Ekspor CSV/PDF/XLSX** | `server/api/laporan/export.get.ts` + `server/utils/rekapMingguan.ts` | CSV/XLSX **mingguan berstruktur referensi (exceljs)**/PDF — selesai (admin+kepala), 1 sheet gabungan kawasan | ✅ |
| **Dashboard real-time** | `app/pages/index.vue` + `SiperpadChart` | Cards + chart multi-series — selesai | ✅ |
| **Audit log viewer** | `server/api/audit-log.get.ts` + tab Audit | Selesai — filter entitas/id, join users | ✅ |
| **Dropbox sync** | `server/api/sync/dropbox.post.ts` + `server/utils/dropbox.ts` (token refresh) | Selesai — JSON backup admin→Dropbox; token sudah terisi | ✅ |
| **Perhitungan otomatis** | `server/utils/rekap.ts` | `getRekapPerJenis/getTimeseries/getTotals` — selesai | ✅ |

---

## 5. Rencana Selanjutnya

### Fase 1 — Inti Perhitungan & Rekap (P0) — *sesuai dokumen: perhitungan otomatis + rekap*

#### 5.1 API Realisasi
```
POST   /api/realisasi              — create (admin/petugas), hitung otomatis vs target.tahun
GET    /api/realisasi?kawasan_id&periode_start&periode_end&status
GET    /api/realisasi/[id]
PUT    /api/realisasi/[id]         — edit draft saja
DELETE /api/realisasi/[id]         — soft/hard guard jika sudah diajukan
POST   /api/realisasi/[id]/ajukan  — draft → diajukan
```
Validasi: `jenis_retribusi_id` aktif, `tanggal` valid, `jumlah >= 0`, `status` guard.

#### 5.2 API Laporan & Agregasi
```
GET /api/laporan/rekap?kawasan_id&tahun&periode_type  — agregasi realisasi vs target per jenis (JOIN target+realisasi)
GET /api/laporan/batch                                 — list laporan_batch
POST /api/laporan/batch                                — buat batch periode
POST /api/laporan/batch/[id]/ajukan|verifikasi|tolak
```
Hitung: `total_realisasi`, `total_target`, `persen_capaian`, `selisih`, `akumulasi semester/tahunan`, `perbandingan antar-bulan`.

#### 5.3 Ekspor — CSV, PDF, XLSX
```
GET /api/laporan/export?format=csv|pdf|xlsx&kawasan_id&tahun&periode_type&periode_start&periode_end
```
- CSV: plain text, header `Kode,Nama,Target,Realisasi,Capaian%`
- XLSX: `exceljs` atau `xlsx` (tanpa native dep besar; prefer `xlsx` jika sudah ada)
- PDF: `pdfkit` atau render HTML → PDF via `puppeteer` (berat) — prefer `pdfkit` minimal
- Semua format pakai agregasi yang sama (service `server/utils/rekap.ts` shared).

#### 5.4 Halaman Data PAD (`/pad`) — Input Realisasi
- Filter: kawasan, jenis retribusi (cascading), tanggal
- Tabel realisasi flat + pagination (reuse pola `jenis-retribusi.vue`)
- Dialog tambah: `jenis_retribusi_id` (select filtered by kawasan), `tanggal`, `jumlah`, `catatan`
- Otomatis tampil `target` tahun berjalan + `capaian %` read-only
- Aksi: edit (draft), ajukan, hapus

#### 5.5 Halaman Laporan (`/laporan`) — Rewrite
- Header filter: kawasan, tahun, periode_type
- Ringkasan cards: Total Target, Total Realisasi, Capaian %, Selisih
- Tabel rekap per jenis retribusi (hierarki indent by level)
- Grafik: realisasi 6/12 bulan (Vuetify sparkline atau `chart.js` minimal — `ponytail: chart.js only when grafik diminta pimpinan`)
- Tombol ekspor: CSV | XLSX | PDF (download via `window.open` ke endpoint export)
- Daftar batch: status, ajukan/verifikasi actions (role-gated)

#### 5.6 Dashboard (`/`) — Widget Real-time
- Cards: PAD bulan ini, capaian tahun, jumlah kawasan aktif
- Mini rekap per kawasan (2 cards: Lasiana vs Kampung Seni)
- Link cepat: Input PAD, Lihat Laporan, Master Data

### Fase 2 — Alur Verifikasi & Master Target (P1) — Selesai

- **Verifikasi** (`/verifikasi`): tabs `realisasi diajukan` + `batch` + `audit` — aksi setujui/tolak (verifikator/kepala/admin), filter & paginasi ✅
- **Master Target** (`/master/target`): CRUD `target` per `jenis_retribusi_id` per `tahun` — upsert & delete ✅
- **Pengguna** (`/pengguna`): CRUD `users` (admin only) — hash scrypt, self guard, soft delete ✅
- **Batch workflow**: `draft → diajukan → disetujui/ditolak` dengan `verified_by/at` + `audit_log` — API + tab Batch ✅

### Fase 3 — Operasional & Kepatuhan (P2) — Selesai

- **Audit log viewer** — tab Audit di `verifikasi.vue` + `GET /api/audit-log` ✅
- **Dropbox sync** — `POST /api/sync/dropbox` (admin) + `server/utils/dropbox.ts` refresh token ✅
- **Buku panduan / SOP** — `docs/SOP_SIPERPAD.md` ✅
- **Pengaturan** (`/settings`): ganti password (`POST /api/auth/change-password`), info sistem (`GET /api/sistem-info`) ✅

---

## 6. Urutan Eksekusi Rekomendasi

1. **Realisasi API + service rekap** — fondasi semua perhitungan
2. **Data PAD page** (`/pad`) — input realisasi + lihat capaian
3. **Laporan rekap API + export CSV** — nilai tercepat, validasi rumus Excel lama
4. **Laporan page** (`/laporan`) — tabel + ringkasan + CSV download
5. **Export XLSX + PDF** — lengkapi 3 format
6. **Dashboard widgets** — real-time untuk pimpinan
7. **Verifikasi flow** — tutup alur persetujuan

Setiap langkah: migrasi tidak diperlukan (schema sudah siap); hanya API + halaman.

---

## 7. Catatan Implementasi

- **Pagination:** client-side (`perPage` ref + `paginated` slice) untuk master; server-side dipertimbangkan jika `realisasi` > 500 baris.
- **Icons:** `@mdi/font` 7.4.47 — pakai icon yang ada (`mdi-format-list-bulleted`, `mdi-map-marker-multiple`); hindari `mdi-list-box-multiple-outline` (tidak ada di 7.x).
- **Auth:** tulis (`POST/PUT/DELETE`) guard `role === 'admin'`; baca boleh semua role terautentikasi.
- **Soft delete:** `jenis_retribusi` dan `realisasi` pakai `aktif=0` / `status` agar histori target/rekap tidak hilang (FK `ON DELETE CASCADE` tidak terpicu).
- **Perhitungan:** pusatkan di `server/utils/rekap.ts` (dipakai rekap API + export) — hindari duplikasi rumus di frontend.
- **Export libs:** tambah hanya saat dibutuhkan (hindari bloat): `xlsx` untuk XLSX, `pdfkit` untuk PDF. CSV tanpa dep (string join).

---

## 8. Definisi Selesai (DoD) per Fase

- [x] Fase 1: input realisasi → rekap otomatis benar vs Excel lama → laporan bisa diekspor CSV/XLSX/PDF → dashboard tampil real-time
- [x] Fase 2: verifikator bisa setujui/tolak batch, target tahunan bisa dikelola, pengguna bisa dikelola admin
- [x] Fase 3: audit trail terlihat (tab Audit), backup Dropbox jalan (POST /api/sync/dropbox), SOP tersedia (docs/SOP_SIPERPAD.md)

---

*Dokumen ini adalah living plan — update tiap fase selesai.*
