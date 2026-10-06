CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  nama          TEXT NOT NULL,
  nip           TEXT NOT NULL DEFAULT '',
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','verifikator','kepala')),
  aktif         INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kawasan (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  kode      TEXT NOT NULL UNIQUE,
  nama      TEXT NOT NULL,
  urutan    INTEGER NOT NULL DEFAULT 0,
  aktif     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS jenis_retribusi (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  kawasan_id  INTEGER NOT NULL REFERENCES kawasan(id) ON DELETE CASCADE,
  parent_id   INTEGER REFERENCES jenis_retribusi(id) ON DELETE CASCADE,
  kode        TEXT NOT NULL DEFAULT '',
  nama        TEXT NOT NULL,
  level       INTEGER NOT NULL DEFAULT 1,
  urutan      INTEGER NOT NULL DEFAULT 0,
  aktif       INTEGER NOT NULL DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_jenis_retribusi_unique
  ON jenis_retribusi (kawasan_id, parent_id, nama);

CREATE TABLE IF NOT EXISTS target (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  jenis_retribusi_id  INTEGER NOT NULL REFERENCES jenis_retribusi(id) ON DELETE CASCADE,
  tahun               INTEGER NOT NULL,
  nilai               INTEGER NOT NULL DEFAULT 0,
  UNIQUE (jenis_retribusi_id, tahun)
);

CREATE TABLE IF NOT EXISTS realisasi (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  jenis_retribusi_id  INTEGER NOT NULL REFERENCES jenis_retribusi(id) ON DELETE CASCADE,
  tanggal             TEXT NOT NULL,
  jumlah              INTEGER NOT NULL DEFAULT 0,
  catatan             TEXT NOT NULL DEFAULT '',
  batch_id            INTEGER REFERENCES laporan_batch(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','diajukan','disetujui','ditolak')),
  created_by          INTEGER NOT NULL REFERENCES users(id),
  created_at          TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS laporan_batch (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  kawasan_id      INTEGER NOT NULL REFERENCES kawasan(id),
  periode_type    TEXT NOT NULL CHECK (periode_type IN ('mingguan','bulanan','semester','tahunan')),
  periode_start   TEXT NOT NULL,
  periode_end     TEXT NOT NULL,
  tahun           INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','diajukan','disetujui','ditolak')),
  diajukan_oleh   INTEGER REFERENCES users(id),
  diajukan_at     TEXT,
  verified_by     INTEGER REFERENCES users(id),
  verified_at     TEXT,
  catatan         TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  aksi        TEXT NOT NULL,
  entitas     TEXT NOT NULL,
  entitas_id  TEXT NOT NULL,
  before      TEXT,
  after       TEXT,
  at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_realisasi_jenis     ON realisasi (jenis_retribusi_id);
CREATE INDEX IF NOT EXISTS idx_realisasi_tanggal   ON realisasi (tanggal);
CREATE INDEX IF NOT EXISTS idx_realisasi_status    ON realisasi (status);
CREATE INDEX IF NOT EXISTS idx_realisasi_batch     ON realisasi (batch_id);
CREATE INDEX IF NOT EXISTS idx_target_tahun        ON target (tahun);
CREATE INDEX IF NOT EXISTS idx_jenis_kawasan       ON jenis_retribusi (kawasan_id);
CREATE INDEX IF NOT EXISTS idx_jenis_parent        ON jenis_retribusi (parent_id);
CREATE INDEX IF NOT EXISTS idx_batch_kawasan_tahun ON laporan_batch (kawasan_id, tahun);
CREATE INDEX IF NOT EXISTS idx_audit_user          ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entitas       ON audit_log (entitas, entitas_id);
