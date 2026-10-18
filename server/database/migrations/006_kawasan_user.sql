-- 006_kawasan_user.sql
-- Petugas penginput dibagi per kawasan (Kampung Seni / Pantai Lasiana).
-- NULL = akses semua kawasan (dipakai admin & kepala).
-- Guard di API: role 'user' dengan kawasan_id terisi hanya boleh input/ajukan
-- untuk jenis retribusi pada kawasan tersebut.

ALTER TABLE users ADD COLUMN kawasan_id INTEGER REFERENCES kawasan(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_kawasan ON users (kawasan_id);
