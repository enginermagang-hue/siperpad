-- 007_settings.sql
-- Tabel settings key-value untuk konfigurasi aplikasi (mis. penanda tangan laporan).
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);