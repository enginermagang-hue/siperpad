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
  → Input realisasi harian (Data PAD — admin)
  → Ajukan (draft → diajukan)
  → Verifikasi (verifikator/kepala — diajukan → disetujui/ditolak)
  → Laporan rekap & ekspor (admin/kepala)
  → Backup Dropbox (admin — tombol di Pengaturan)
```

## 3. Langkah Operasional

### 3.1 Input Realisasi (Admin)
1. Buka **Data PAD** (`/pad`).
2. Klik **Tambah Realisasi** — pilih Jenis Retribusi, isi Tanggal (YYYY-MM-DD), Jumlah (≥0), Catatan.
3. Halaman menampilkan **Target tahun berjalan** dan **Capaian %** otomatis (preview via `/api/target`).
4. Klik **Simpan** (status `draft`).
5. Pada tabel, klik **Ajukan** (ikon send) — status menjadi `diajukan`, tidak bisa diedit/hapus lagi.

### 3.2 Kelola Target Tahunan (Admin)
1. Buka **MASTER DATA → Target Tahunan** (`/master/target`).
2. Filter Kawasan dan Tahun.
3. **Tambah Target**: pilih Jenis, isi Tahun & Nilai (Rp). Simpan — upsert `(jenis, tahun)`.
4. **Hapus**: non-aktifkan target yang salah (tidak memengaruhi realisasi histori).

### 3.3 Verifikasi (Verifikator/Kepala)
1. Buka **Verifikasi** (`/verifikasi`) — tab **Realisasi Diajukan**.
2. Filter per kawasan/jenis bila perlu. Klik **Setujui** atau **Tolak** — status berubah, tercatat di **Audit Trail**.
3. Tab **Batch Laporan** — admin membuat batch periode (mis. `bulanan 2026-08`), lalu ajukan. Verifikator men-setujui/menolak batch.
4. Tab **Audit Trail** — lihat jejak `VERIFIKASI_SETUJU/TOLAK`, `BATCH_AJUKAN/SETUJU/TOLAK`; filter per entitas.

### 3.4 Laporan & Ekspor
1. Buka **Laporan** (`/laporan`) — filter kawasan & tahun; lihat cards Total Target/Realisasi/Capaian/Selisih dan tabel rekap per jenis.
2. Tombol **CSV / XLSX / PDF** (hanya admin/kepala) — `GET /api/laporan/export?format=…` — unduh langsung.

### 3.5 Manajemen Pengguna (Admin)
Buka **Pengguna** — tambah/edit (nama/nip/email/role/aktif/password), nonaktifkan (soft delete — `aktif=0`). Tidak bisa nonaktifkan diri sendiri.

### 3.6 Pengaturan
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

- Setiap aksi `verifikasi`, `ajukan batch`, `verifikasi batch` menulis baris `audit_log`.
- Lihat via **Verifikasi → Audit Trail** atau `GET /api/audit-log?entitas=&entitas_id=&limit=50`.
- Backup JSON harian via **Pengaturan** atau cron: `POST /api/sync/dropbox` (admin only, Bearer session).

## 6. Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Tidak bisa ajukan realisasi | Hanya `draft` bisa diajukan; pastikan status masih draft |
| Total rekap tidak muncul | Pastikan target tahun tersebut sudah diisi |
| Dropbox upload gagal | Cek `DROPBOX_APP_KEY/SECRET/REFRESH_TOKEN`; lihat log server |
