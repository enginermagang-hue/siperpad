-- 008_realisasi_unique.sql
-- Tambah unique constraint pada (jenis_retribusi_id, tanggal) agar upsert
-- grid aman dari race condition (duplikat baris).

CREATE UNIQUE INDEX IF NOT EXISTS idx_realisasi_jenis_tanggal ON realisasi (jenis_retribusi_id, tanggal);