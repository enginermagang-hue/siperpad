# SOP SiPerPAD — Sistem Perhitungan & Rekapitulasi PAD

> Kawasan Wisata Lasiana & Kampung Seni — Dinas Pariwisata dan Ekonomi Kreatif Prov. NTT

## 1. Peran Pengguna

| Role | Akses |
|------|-------|
| `admin` | Input realisasi, kelola master (kawasan/jenis/target), kelola pengguna, buat & ajukan batch, verifikasi batch/realisasi, ekspor laporan, sinkronisasi Dropbox |
| `verifikator` | Lihat semua, verifikasi realisasi & batch (`diajukan → disetujui/ditolak`), lihat audit log |
| `kepala` | Lihat laporan & dashboard, ekspor CSV/XLSX/PDF, verifikasi batch/realisasi |

## 2. Alur Kerja

```
Master (kawasan → jenis retribusi → target tahunan)
  → Input realisasi (Data PAD harian, atau Entri Mingguan grid — admin)
  → Ajukan (draft → diajukan; bisa massal per periode/kawasan)
  → Verifikasi (verifikator/kepala — diajukan → disetujui/ditolak)
  → Angka resmi = hanya status DISETUJUI (dashboard/laporan/ekspor)
  → Laporan rekap, perbandingan periode & ekspor (admin/kepala)
  → Kunci periode terkunci (admin) setelah semua terverifikasi
  → Backup Dropbox (admin — tombol di Pengaturan)
```

> **Penting:** hanya realisasi berstatus **`disetujui`** yang dihitung di dashboard, laporan, dan ekspor. Data `draft`/`diajukan` belum muncul di angka resmi.

## 3. Langkah Operasional

### 3.1 Input Realisasi (Admin)
**A. Via Data PAD (harian)**
1. Buka **Data PAD** (`/pad`).
2. Klik **Tambah Realisasi** — pilih Jenis Retribusi, isi Tanggal (YYYY-MM-DD), Jumlah (≥0), Catatan.
3. Halaman menampilkan **Target tahun berjalan** dan **Capaian %** otomatis (preview via `/api/target`).
4. Klik **Simpan** (status `draft`).
5. Pada tabel, klik **Ajukan** (ikon send) — status menjadi `diajukan`, tidak bisa diedit/hapus lagi.

**B. Via Entri Mingguan (grid — admin)**
1. Buka **Entri Mingguan** (`/entri-mingguan`).
2. Pilih Kawasan, Bulan, Tahun. Isi nilai per Minggu I–IV (tanggal representatif: hari 1/8/15/22).
3. Klik di luar sel / Enter untuk menyimpan tiap sel (status `draft`).
4. Klik **Ajukan Semua** untuk mengajukan semua draft periode tsb (`POST /api/realisasi/ajukan-massal`).

### 3.2 Kelola Target Tahunan (Admin)
1. Buka **MASTER DATA → Target Tahunan** (`/master/target`).
2. Filter Kawasan dan Tahun.
3. **Tambah Target**: pilih Jenis, isi Tahun & Nilai (Rp). Simpan — upsert `(jenis, tahun)`.
   - Untuk baris **kategori/induk** (punya anak), nilai disimpan sebagai *nilai induk tertulis* (`nilai_induk`). Angka resmi tetap **jumlah anak** (Model A).
4. **Hapus**: hapus target yang salah (tidak memengaruhi realisasi histori).
5. **Peringatan anomali** muncul bila target induk tertulis ≠ jumlah anak (contoh A.2: selisih Rp13.680.000) — koordinasikan dengan Bendahara Penerimaan.

### 3.3 Verifikasi (Verifikator/Kepala/Admin)
1. Buka **Verifikasi** (`/verifikasi`) — tab **Realisasi Diajukan**.
2. Filter per kawasan/jenis bila perlu. Klik **Setujui** atau **Tolak**, atau **Setujui Semua** untuk massal — status berubah, tercatat di **Audit Trail**.
3. Tab **Batch Laporan** — admin membuat batch periode (mis. `bulanan 2026-08`), lalu ajukan. Verifikator men-setujui/menolak batch.
4. Tab **Kunci Periode** (admin) — lihat bagian 3.7.
5. Tab **Catatan Temuan** — lihat bagian 3.8.
6. Tab **Audit Trail** — lihat jejak `VERIFIKASI_SETUJU/TOLAK`, `VERIFIKASI_MASSAL_*`, `KUNCI_PERIODE`, `BUKA_PERIODE`; filter per entitas.

### 3.4 Laporan, Perbandingan & Ekspor
1. Buka **Laporan** (`/laporan`).
   - Tab **Rekap** — filter kawasan & tahun; cards Total Target/Realisasi/Capaian/Selisih dan tabel rekap per jenis.
   - Tab **Perbandingan Periode** — pilih Kawasan, Tahun, Periode A vs Periode B (bulan) → matriks nilai A, B, selisih, %. API: `GET /api/laporan/bandingkan`.
2. Tombol **CSV / XLSX / PDF** (hanya admin/kepala) — `GET /api/laporan/export?format=…` — unduh langsung. Catatan anomali target ikut tercetak di XLSX.

### 3.5 Dashboard Analitik
Buka **Dashboard** (`/`):
- Filter Kawasan / Bulan / Tahun / Scope (Bulanan–Triwulan–Tahunan).
- KPI: Target tahun, Realisasi s/d bulan ini, % Capai, Selisih bulan ini vs bulan lalu.
- Grafik Realisasi vs Target + **Tren Mingguan** (I–IV).
- **Top Kontributor** PAD + donut komposisi.
- Banner **peringatan anomali target** (bila ada).

### 3.6 Manajemen Pengguna (Admin)
Buka **Pengguna** — tambah/edit (nama/nip/email/role/aktif/password), nonaktifkan (soft delete — `aktif=0`). Tidak bisa nonaktifkan diri sendiri.

### 3.7 Penguncian Periode (Admin)
1. Buka **Verifikasi → Kunci Periode**.
2. Pilih Kawasan, Tahun, Bulan → **Kunci Periode**.
3. Syarat: **tidak ada** realisasi `draft`/`diajukan` pada periode tsb (verifikasi dahulu). `POST /api/periode-lock`.
4. Selama terkunci, input/edit/hapus realisasi pada periode tsb ditolak (HTTP 409) — termasuk Entri Mingguan.
5. **Buka** kunci: tombol **Buka** pada tabel (`DELETE /api/periode-lock/:id`). Semua aksi tercatat di audit log.

### 3.8 Catatan Temuan
1. Buka **Verifikasi → Catatan Temuan**.
2. Pilih Kawasan/Tahun/Bulan, isi catatan → **Tambah** (`POST /api/catatan`).
3. Tandai **Selesai**/**Buka** (`PUT /api/catatan/:id`); admin dapat menghapus (`DELETE /api/catatan/:id`).

### 3.9 Pengaturan
Buka **Pengaturan** (`/settings`):
- **Ganti password** — isi password lama + baru (min 6 char) → `POST /api/auth/change-password`.
- **Info sistem** — jumlah master pengguna/kawasan/jenis/target/realisasi/batch/audit; status integrasi Dropbox.
- **Sinkronisasi Dropbox** (admin) — tombol **Sinkron ke Dropbox** (`POST /api/sync/dropbox`) — mengunggah JSON dump ke `DROPBOX_FOLDER`.

## 4. Pengaturan Lingkungan (.env)

```
TURSO_DATABASE_URL=libsql://…
TURSO_AUTH_TOKEN=…
DROPBOX_APP_KEY=…
DROPBOX_APP_SECRET=…
DROPBOX_REFRESH_TOKEN=…
DROPBOX_FOLDER=/siperpad
NUT_SESSION_PASSWORD=… (>32 char)
```

- Token Dropbox diperoleh via `npm run dropbox:token`; refresh ditangani SDK otomatis.
- Migrasi: `POST /api/migrate` atau `npm run migrate`.

## 5. Audit & Backup

- Setiap aksi `verifikasi`, `ajukan batch`, `verifikasi batch`, `ajukan massal`, `verifikasi massal`, `kunci/buka periode` menulis baris `audit_log`.
- Lihat via **Verifikasi → Audit Trail** atau `GET /api/audit-log?entitas=&entitas_id=&limit=50`.
- Backup JSON harian via **Pengaturan** atau cron: `POST /api/sync/dropbox` (admin only, Bearer session).

## 6. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Tidak bisa ajukan realisasi | Hanya `draft` bisa diajukan; pastikan status masih draft |
| Total rekap/dashboard = 0 padahal sudah input | Angka resmi hanya status **`disetujui`** — ajukan lalu verifikasi dahulu |
| Total rekap tidak muncul | Pastikan target tahun tersebut sudah diisi |
| Tidak bisa input/edit realisasi (HTTP 409) | Periode sedang **terkunci** — minta admin membuka kunci (Verifikasi → Kunci Periode) |
| Tidak bisa mengunci periode | Masih ada realisasi `draft`/`diajukan` pada periode tsb — verifikasi dahulu |
| Peringatan anomali target muncul | Target induk tertulis ≠ jumlah anak — koordinasikan dengan Bendahara Penerimaan; angka resmi tetap jumlah anak |
| Dropbox upload gagal | Cek `DROPBOX_APP_KEY/SECRET/REFRESH_TOKEN`; lihat log server |
