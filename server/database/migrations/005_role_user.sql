-- 005_role_user.sql
-- Struktur role baru: user / admin / kepala.
-- - user   : input realisasi + ajukan realisasi & batch (pemisahan tugas).
-- - admin  : gabungan admin + verifikator lama (master data, pengguna,
--            verifikasi, ekspor, kunci periode, sync Dropbox).
-- - kepala : lihat laporan/dashboard, ekspor, verifikasi.
-- Tabel users di-rebuild untuk mengubah CHECK constraint sekaligus memetakan
-- role lama: verifikator -> admin.
--
-- FK enforcement aktif di libSQL/Turso; gunakan defer_foreign_keys (bisa diubah
-- di dalam transaksi) supaya DROP TABLE users tidak langsung ditolak. Cek FK
-- ditunda sampai COMMIT, saat users sudah dibuat ulang dengan id yang sama.

PRAGMA defer_foreign_keys=ON;

DROP TABLE IF EXISTS users_new;

CREATE TABLE users_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nama          TEXT NOT NULL,
  nip           TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user','admin','kepala')),
  aktif         INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new (id, nama, nip, email, password_hash, role, aktif, created_at, updated_at)
SELECT id, nama, nip, email, password_hash,
       CASE WHEN role = 'verifikator' THEN 'admin' ELSE role END,
       aktif, created_at, updated_at
FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;
