-- Fase 4 — Perbandingan periode, anomali target, penguncian periode,
-- entri grid mingguan, tarif objek, dan log catatan temuan.

-- Target induk tertulis (nilai sesuai dokumen) — dipakai untuk deteksi anomali.
-- Model perhitungan resmi tetap SUM anak; kolom ini hanya menyimpan angka induk apa adanya.
ALTER TABLE target ADD COLUMN nilai_induk INTEGER;

-- Tarif objek retribusi (opsional, informasi saja).
ALTER TABLE jenis_retribusi ADD COLUMN tarif INTEGER;

-- Penguncian periode per kawasan. Admin dapat mengunci/membuka.
CREATE TABLE IF NOT EXISTS periode_lock (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tahun       INTEGER NOT NULL,
  bulan       INTEGER NOT NULL,
  kawasan_id  INTEGER NOT NULL REFERENCES kawasan(id) ON DELETE CASCADE,
  locked_by   INTEGER REFERENCES users(id),
  locked_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (tahun, bulan, kawasan_id)
);

-- Log catatan / temuan per periode (mis. selisih target, deviasi penerimaan).
CREATE TABLE IF NOT EXISTS catatan_temuan (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  tahun               INTEGER NOT NULL,
  bulan               INTEGER NOT NULL,
  kawasan_id          INTEGER NOT NULL REFERENCES kawasan(id) ON DELETE CASCADE,
  jenis_retribusi_id  INTEGER REFERENCES jenis_retribusi(id) ON DELETE SET NULL,
  isi                 TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'terbuka' CHECK (status IN ('terbuka','selesai')),
  created_by          INTEGER REFERENCES users(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_periode_lock_periode ON periode_lock (tahun, bulan);
CREATE INDEX IF NOT EXISTS idx_catatan_periode      ON catatan_temuan (tahun, bulan, kawasan_id);
