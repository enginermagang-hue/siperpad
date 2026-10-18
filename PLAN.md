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
| UI | Preline UI 5 + Tailwind CSS 4 (`@tailwindcss/vite`, `@tailwindcss/forms`), `lucide-vue-next` (ikon), `vue3-apexcharts` + `apexcharts` |
| Auth | `nuxt-auth-utils` — session cookie, `NUXT_SESSION_PASSWORD` 32+ char |
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
| `users` | `id, nama, nip, email, role(user/admin/kepala), aktif` | ✅ seeded 3 user (`user@mail.com`/`admin@mail.com`/`kepala@mail.com` / `123456`) — `admin` = gabungan admin+verifikator lama (migrasi `005_role_user.sql`) |
| `kawasan` | `id, kode(UNIQUE), nama, urutan, aktif` | ✅ seeded 2 kawasan (A: Kampung Seni, B: Pantai Lasiana) |
| `jenis_retribusi` | `id, kawasan_id, parent_id(self-ref), kode (kode jenis), kode_rekening (opsional, induk/sub-induk), nama, level, urutan, aktif` — unique `(kawasan_id, parent_id, nama)` | ✅ seeded ~35 jenis hierarkis; `kode_rekening` via migrasi `004_kode_rekening.sql` + input di `jenis-retribusi.vue`, dipakai kolom "Kode Rekening" PDF |
| `target` | `jenis_retribusi_id, tahun, nilai` — unique `(jenis_retribusi_id, tahun)` | ✅ seeded 2026 + CRUD `server/api/target*` + `app/pages/master/target.vue` |
| `realisasi` | `jenis_retribusi_id, tanggal, jumlah, catatan, batch_id, status(draft/diajukan/disetujui/ditolak), created_by` | ✅ API + UI (`server/api/realisasi*` termasuk `verifikasi`, `app/pages/pad.vue` + `app/pages/verifikasi/*`) |
| `laporan_batch` | `kawasan_id, periode_type(mingguan/bulanan/semester/tahunan), periode_start/end, tahun, status, diajukan_oleh, verified_by` | ✅ API `server/api/laporan/batch*` + `app/pages/verifikasi/batch.vue` |
| `audit_log` | `user_id, aksi, entitas, entitas_id, before/after` | ✅ API `server/api/audit-log.get.ts` + `app/pages/verifikasi/audit.vue` |
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
| Navigasi | Sidebar role-aware — Dashboard; Data PAD/Input Realisasi (user); Verifikasi (admin/kepala); Pengajuan Batch (user); Data Master (admin); Rekap & Laporan; Pengaturan Sistem (Pengaturan semua, Pengguna admin) | ✅ |

### 3.3 Master Data — Selesai

| Halaman | File | Fitur | Status |
|---------|------|-------|--------|
| **Kawasan Wisata** | `app/pages/kawasan-wisata.vue` | CRUD flat `v-table`, search, dialog tambah/edit, hapus guard FK, snackbar, admin-only write | ✅ |
| **Jenis Retribusi** | `app/pages/jenis-retribusi.vue` | CRUD flat `v-table`, filter kawasan, search, parent select, pagination client (`perPage 5/10/25/50`), info `from–to dari total`, soft delete (`aktif=0`), admin-only write | ✅ |
| API Kawasan | `server/api/kawasan.get.ts`, `kawasan.post.ts`, `kawasan/[id].get/put/delete.ts` | ✅ | ✅ |
| API Jenis Retribusi | `server/api/jenis-retribusi.get.ts`, `jenis-retribusi.post.ts`, `jenis-retribusi/[id].get/put/delete.ts` | level auto dari parent, unique guard, soft delete | ✅ |

Sidebar: group **MASTER DATA** (`Kawasan Wisata` ikon `MapPin` + `Jenis Retribusi` ikon `List`).

Dihapus: `app/pages/master-data.vue` (placeholder).

### 3.4 Laporan, Rekap & Dashboard — Selesai (Fase 1 parsial)

| Fitur | File | Detail | Status |
|-------|------|--------|--------|
| Service rekap | `server/utils/rekap.ts` | `getRekapPerJenis`, `getTimeseries(bulanan/triwulan/tahunan)`, `getTotals` — dipakai rekap & export | ✅ |
| Rekap API | `server/api/laporan/rekap.get.ts` | `GET ?kawasan_id&tahun&scope` — auth semua role, return `perJenis/totals/timeseries` | ✅ |
| Export API | `server/api/laporan/export.get.ts` | `GET ?format=csv/xlsx/pdf&kawasan_id&tahun&bulan` — **auth admin+kepala only (403)**, CSV zero-dep, XLSX mingguan via `exceljs` (struktur persis referensi), PDF **LAPORAN REALISASI PENERIMAAN** landscape 14"×8.5" via `pdfkit` (9 kolom: Kode Rekening/Jenis/Volume-Satuan/Target/s-d Lalu/Bulan Ini/s-d Bulan Ini/%/Keterangan, hierarki indent, baris TOTAL, blok tanda tangan Kepala Dinas + Bendahara) | ✅ — XLSX: judul merge A:K, header 2 baris + merge I-IV, indent hierarki, freeze, TOTAL kuning, % `0.00%`, ringkasan 1/2/3 + catatan |
| Chart | `app/components/SiperpadChart.vue` | Wrapper `vue3-apexcharts` client-only dynamic import, multi-series, export PNG | ✅ |
| Dashboard | `app/pages/index.vue` | Filter kawasan+tahun+scope dropdown, cards Total Target/Realisasi/Capaian/Selisih, `SiperpadChart` multi-series + Ekspor PNG, health cards | ✅ |
| Laporan | `app/pages/laporan.vue` | Filter kawasan+tahun+**bulan**+search, summary cards, tabel rekap flat + pagination 5/10/25/50, export buttons CSV/XLSX/PDF (admin+kepala, XLSX kirim `bulan`) | ✅ |

### 3.5 Data PAD — Realisasi (Fase 2) — Selesai

| Fitur | File | Detail | Status |
|-------|------|--------|--------|
| Realisasi API | `server/api/realisasi.get.ts`, `realisasi.post.ts`, `realisasi/[id].get/put/delete.ts`, `realisasi/[id]/ajukan.post.ts` | Filter kawasan/jenis/status/tanggal, capaian vs target, guard `draft` only edit/delete, `ajukan` draft→diajukan, admin-only write | ✅ |
| Verifikasi realisasi | `server/api/realisasi/[id]/verifikasi.post.ts` | `diajukan → disetujui/ditolak` — role admin/kepala, audit_log | ✅ |
| Target CRUD | `server/api/target.get.ts` (list+lookup), `target.post.ts`, `target/[id].delete.ts` | `GET ?tahun&kawasan_id` list, `POST` upsert `(jenis,tahun)`, `DELETE`, admin-only, detail lookup `?jenis_retribusi_id&tahun` | ✅ |
| Target page | `app/pages/master/target.vue` | Filter kawasan/tahun+search, tabel + pagination 5/10/25/50, dialog upsert, hapus, admin-only | ✅ |
| Target lookup | `server/api/target.get.ts` | `GET ?jenis_retribusi_id&tahun` → nilai target untuk preview capaian di pad/verifikasi | ✅ |
| Data PAD page | `app/pages/pad.vue` | Filter kawasan/jenis/status+search, tabel realisasi + capaian chip + pagination, dialog tambah/edit dengan preview target & capaian, ajukan & hapus draft | ✅ |
| Panel langkah perhitungan | `app/components/PerhitunganPanel.vue`, `app/pages/pad.vue`, `app/pages/entri-mingguan.vue` | Baris tabel bisa di-expand (inline) menampilkan langkah perhitungan: mode/formula, rincian Minggu I–IV, target, total, capaian — semua role, read-only | ✅ |

### 3.6 Fase 2 — Verifikasi, Batch, Pengguna & Audit — Selesai

| Fitur | File | Detail | Status |
|-------|------|--------|--------|
| Verifikasi page | `app/pages/verifikasi/*.vue` | Halaman terpisah: Realisasi Diajukan, Batch Laporan, Kunci Periode, Catatan Temuan, Audit Trail (dulu tab dalam satu file) | ✅ |
| Batch API | `server/api/laporan/batch.get/post.ts`, `batch/[id]/ajukan+verifikasi.post.ts` | `GET ?kawasan_id&status`, `POST` create draft, `ajukan` draft→diajukan (admin), `verifikasi` diajukan→disetujui/ditolak + audit | ✅ |
| Pengguna API | `server/api/users.get/post.ts`, `users/[id]/put/delete.ts` | List/create/update/soft-delete (aktif=0), scrypt hash, self-delete guard, admin-only | ✅ |
| Pengguna page | `app/pages/pengguna.vue` | Tabel + search + pagination, dialog tambah/edit (role/password/aktif), nonaktifkan guard self, admin-only | ✅ |
| Audit log API | `server/api/audit-log.get.ts` | `GET ?entitas&entitas_id&aksi&limit` join users, semua role read | ✅ |
| Audit viewer | `app/pages/verifikasi/audit.vue` | Filter entitas/id, tabel at/user/aksi/entitas/before→after | ✅ |
| Navigasi | `app/layouts/default.vue` | Role-aware: Verifikasi (admin/kepala) + sub-halaman; Pengajuan Batch (user); Data Master (admin); Data PAD/Input Realisasi; Pengaturan Sistem | ✅ |

### 3.7 Fase 3 — Pengaturan, Dropbox & SOP — Selesai

| Fitur | File | Detail | Status |
|-------|------|--------|--------|
| Pengaturan page | `app/pages/settings.vue` | Ganti password (lama+baru+konfirmasi) + Info Sistem (counts, dropbox status) + Sinkron ke Dropbox (admin) + link SOP | ✅ |
| Ganti password API | `server/api/auth/change-password.post.ts` | Scrypt verify + hash, min 6 char, self only | ✅ |
| Info sistem API | `server/api/sistem-info.get.ts` | Counts users/kawasan/jenis/target/realisasi/batch/audit + dropbox ready + current user | ✅ |
| Dropbox sync API | `server/api/sync/dropbox.post.ts` | Admin-only; dump JSON → `DROPBOX_FOLDER/siperpad-backup-YYYY-MM-DD.json` via SDK `filesUpload` | ✅ |
| SOP | `docs/SOP_SIPERPAD.md` | Peran, alur, langkah operasional lengkap (input, target, verifikasi, laporan, pengguna, pengaturan), env & troubleshooting | ✅ |

### 3.8 Fase 5 — Restrukturisasi Role (user/admin/kepala) — Selesai

Migrasi `server/database/migrations/005_role_user.sql` — rebuild tabel `users` (`CHECK (role IN ('user','admin','kepala'))`) sekaligus mapping role lama `verifikator` → `admin`.

| Perubahan | Detail | Status |
|-----------|--------|--------|
| Role baru `user` | Input realisasi (Data PAD + grid mingguan), edit/hapus draft, ajukan realisasi (satuan & massal), buat & ajukan batch laporan | ✅ |
| `admin` = admin + verifikator lama | Kelola master & pengguna, verifikasi realisasi & batch, ekspor, kunci periode, sync Dropbox | ✅ |
| `kepala` | Lihat laporan/dashboard, ekspor, verifikasi realisasi & batch | ✅ |
| Guard API | Input/ajukan → `user`; verifikasi & ekspor → `admin`/`kepala`; master/users/sync/periode-lock → `admin` | ✅ |
| Middleware & nav | `/kawasan-wisata`,`/jenis-retribusi`,`/master/target`,`/pengguna` admin-only; `/verifikasi` admin/kepala/user; label `user` = "Petugas Input", `admin` = "Administrator" | ✅ |
| Sidebar & halaman Verifikasi | `app/layouts/default.vue`, `app/pages/verifikasi/*`, `app/components/VerifikasiNav.vue`, `app/composables/useVerifikasiMaster.ts` | Sidebar role-aware; tab Verifikasi dipecah jadi 5 halaman; guard sub-route (`/verifikasi/periode`,`/verifikasi/catatan` admin-only; `user` hanya `/verifikasi/batch`) | ✅ |
| Seed & script | `user@mail.com` (user), `admin@mail.com` (admin), `kepala@mail.com` (kepala) / `123456` | ✅ |

**Keputusan kunci Fase 5:**
- Pemisahan tugas: `user` menginput & mengajukan; `admin`/`kepala` memverifikasi — `admin` tidak lagi menginput realisasi.
- `admin` = gabungan admin + verifikator lama (nama `admin` dipertahankan).
- Angka resmi tetap hanya status `disetujui`.
- Sesi lama yang masih menyimpan role `admin`/`verifikator` perlu **login ulang** agar role baru berlaku.

---

## 4. Apa yang Belum Dibangun

| Halaman / Modul | File saat ini | Kondisi | Prioritas |
|-----------------|---------------|---------|-----------|
| **Dashboard** (`/`) | `app/pages/index.vue` | Filter kawasan+tahun+scope, cards, chart multi-series — selesai | ✅ |
| **Data PAD** (`/pad`) | `app/pages/pad.vue` | Filter + tabel realisasi + dialog + preview capaian — selesai | ✅ |
| **Laporan** (`/laporan`) | `app/pages/laporan.vue` | Rekap + export CSV/XLSX/PDF — selesai | ✅ |
| **Verifikasi** (`/verifikasi`) | `app/pages/verifikasi/*.vue` | Halaman terpisah: realisasi diajukan, batch, kunci periode, catatan temuan, audit — selesai | ✅ |
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
- Grafik: realisasi 6/12 bulan (`vue3-apexcharts`; sudah terpasang — tidak perlu `chart.js`)
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

- **Audit log viewer** — `app/pages/verifikasi/audit.vue` + `GET /api/audit-log` ✅
- **Dropbox sync** — `POST /api/sync/dropbox` (admin) + `server/utils/dropbox.ts` refresh token ✅
- **Buku panduan / SOP** — `docs/SOP_SIPERPAD.md` ✅
- **Pengaturan** (`/settings`): ganti password (`POST /api/auth/change-password`), info sistem (`GET /api/sistem-info`) ✅

### Fase 4 — Analitik, Pengendalian & Kepatuhan Data (P1) — Selesai

Migrasi `server/database/migrations/002_fase4.sql` (kolom `target.nilai_induk`, `jenis_retribusi.tarif`, tabel `periode_lock`, `catatan_temuan`) dan `003_mode_tarif.sql` (kolom `jenis_retribusi.mode_tarif`/`satuan`, `realisasi.kuantitas`/`tarif`).

| # | Fitur | File | Detail | Status |
|---|-------|------|--------|--------|
| 4.0 | **Unifikasi rekap** | `server/utils/rekap.ts`, `server/utils/rekapMingguan.ts`, `server/utils/periode.ts` | Model A: nilai induk = SUM anak (hindari double-count); filter `aktif=1`; **angka resmi hanya status `disetujui`**; helper periode bersama (`dayToBucket`, `monthStart`, dll.) | ✅ |
| 4.1 | **Perbandingan antar periode** | `server/api/laporan/bandingkan.get.ts` + tab di `laporan.vue` | `GET ?tahun&bulan_a&bulan_b` atau rentang bebas `a_from/a_to/b_from/b_to`; matriks per pos + selisih & % | ✅ |
| 4.2 | **Dashboard analitik** | `app/pages/index.vue`, `app/api/laporan/rekap.get.ts`, `SiperpadChart.vue` (type bar/donut) | KPI realisasi s/d bulan ini, tren mingguan I–IV, bulan vs bulan lalu, Top Kontributor + donut komposisi, perbaikan karakter rusak | ✅ |
| 4.3 | **Anomali target anak ≠ induk** | `server/utils/rekap.ts` (`getTargetAnomali`), `server/api/target/anomali.get.ts`, banner di `index.vue`/`master/target.vue`, catatan di export | Deteksi selisih target induk tertulis vs SUM anak (contoh A.2: selisih Rp13.680.000) | ✅ |
| 4.4 | **Penguncian periode** | `server/api/periode-lock.get/post.ts`, `periode-lock/[id].delete.ts`, `server/utils/lock.ts`, `app/pages/verifikasi/periode.vue` | Admin-only; kunci per (tahun, bulan, kawasan); guard di `realisasi.post/put/delete` + grid + ajukan; tolak kunci bila masih ada draft/diajukan | ✅ |
| 4.5 | **Entri grid mingguan** | `app/pages/entri-mingguan.vue`, `server/api/realisasi/grid.get/post.ts`, `ajukan-massal.post.ts` | Tabs Minggu I–IV + tabel read-only (kolom Status per minggu); input/edit via **modal** per tab (jenis leaf, nilai, catatan, preview target/kumulatif); edit & hapus entri `draft` dari tabel; "Ajukan Minggu Ini"/"Ajukan Semua". Tanggal representatif 1/8/15/22 | ✅ |
| 4.6 | **Tarif objek + catatan temuan** | `jenis-retribusi.*` (+`tarif`), `server/api/catatan.get/post.ts`, `catatan/[id].put/delete.ts`, `app/pages/verifikasi/catatan.vue` | Field tarif opsional di master jenis; log catatan/temuan per periode (terbuka/selesai) | ✅ |
| 4.7 | **Mode tarif kuantitas/langsung** | migrasi `003_mode_tarif.sql`, `jenis-retribusi.*` (+`mode_tarif`,`satuan`), `realisasi/grid.post|get.ts`, `app/pages/jenis-retribusi.vue`, `app/pages/entri-mingguan.vue` | Per jenis: `langsung` (nilai Rp) atau `kuantitas` (unit × tarif). `realisasi.jumlah` tetap Rupiah = `round(kuantitas × tarif)`; `kuantitas`+`tarif` disimpan sebagai jejak historis. Modal entri menyesuaikan mode (input unit + preview `200 × Rp2.000 = Rp400.000`); tabel menampilkan total + caption kuantitas×tarif. Mode kuantitas tanpa tarif diblokir di modal | ✅ |
| 4.8 | **Kode rekening jenis retribusi** | migrasi `004_kode_rekening.sql`, `jenis-retribusi.{get,post}.ts`, `jenis-retribusi/[id].put.ts`, `app/pages/jenis-retribusi.vue`, `server/api/laporan/export.get.ts`, `server/database/seed.ts` | Field baru `jenis_retribusi.kode_rekening` (mis. `4.1.02,02.012`) terpisah dari `kode` (kode jenis `A.1`). Pengisian opsional di semua level (induk/sub-induk lazim diisi, leaf dibiarkan kosong); dipakai kolom **Kode Rekening** pada PDF LAPORAN REALISASI PENERIMAAN. Seed mengisi induk A.1/B.1=`4.1.02,02.014`, A.2=`4.1.02,02.012`, B.2=`4.1.02,02.017` | ✅ |
| 4.9 | **List numbering hierarki** | `server/utils/rekapMingguan.ts` (+field `nomor`), `server/api/laporan/export.get.ts` (PDF + XLSX) | Penomoran bersarang di kolom **JENIS PENERIMAAN** untuk semua level: level 1=`1.`, level 2=`a.` (lanjut `aa`), level 3=`1.`, level ≥4=`-`. Nomor di-reset per induk, dihitung dari indeks sibling setelah sort (`urutan`,`id`). Kawasan & TOTAL tanpa nomor. Kolom Kode Rekening tetap kode rekening resmi | ✅ |

**Keputusan kunci Fase 4:**
- Angka resmi = realisasi status **`disetujui`** saja (draft/diajukan tidak dihitung) → wajib "Ajukan Semua" + verifikasi massal agar data tampil.
- Target induk disimpan terpisah (`nilai_induk`) untuk peringatan; hitungan resmi tetap SUM anak.
- Hanya **admin** yang boleh mengunci/membuka periode.
- Entri grid memakai tanggal representatif per minggu (hari 1/8/15/22).
- Mode tarif per jenis: `langsung` (input nilai Rp) atau `kuantitas` (input unit, `jumlah = round(kuantitas × tarif)`). Tarif diambil dari `jenis_retribusi.tarif` tunggal (bukan per tahun); `realisasi` menyimpan `kuantitas`+`tarif` sebagai jejak historis agar tampilan tetap akurat meski tarif master berubah.

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
- **Icons:** `lucide-vue-next` — import per file (`import { MapPin } from 'lucide-vue-next'`). Sudah diverifikasi: seluruh nama ikon yang dipakai ada di paket (65 nama unik).
- **Auth:** role `user`/`admin`/`kepala` (lihat §3.8). Tulis master/users/sync/periode-lock guard `admin`; input & ajukan realisasi/batch guard `user`; verifikasi & ekspor guard `admin`/`kepala`; baca boleh semua role terautentikasi.
- **Soft delete:** `jenis_retribusi` dan `realisasi` pakai `aktif=0` / `status` agar histori target/rekap tidak hilang (FK `ON DELETE CASCADE` tidak terpicu).
- **Perhitungan:** pusatkan di `server/utils/rekap.ts` (dipakai rekap API + export) — hindari duplikasi rumus di frontend.
- **Export libs:** tambah hanya saat dibutuhkan (hindari bloat): `xlsx` untuk XLSX, `pdfkit` untuk PDF. CSV tanpa dep (string join).

---

## 8. Definisi Selesai (DoD) per Fase

- [x] Fase 1: input realisasi → rekap otomatis benar vs Excel lama → laporan bisa diekspor CSV/XLSX/PDF → dashboard tampil real-time
- [x] Fase 2: verifikator bisa setujui/tolak batch, target tahunan bisa dikelola, pengguna bisa dikelola admin
- [x] Fase 3: audit trail terlihat (tab Audit), backup Dropbox jalan (POST /api/sync/dropbox), SOP tersedia (docs/SOP_SIPERPAD.md)
- [x] Fase 4: rekap terunifikasi (induk=SUM anak, hanya disetujui) → perbandingan antar periode → dashboard analitik (KPI s/d bulan ini, tren mingguan, Top Kontributor) → deteksi anomali target → penguncian periode (admin) → entri grid mingguan → tarif objek + log catatan temuan → mode tarif kuantitas/langsung

---

*Dokumen ini adalah living plan — update tiap fase selesai.*
