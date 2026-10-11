-- Kode rekening resmi (mis. 4.1.02,02.012). Berbeda dari `kode` yang merupakan
-- kode jenis (A.1, A.2.1.a). Hanya relevan untuk induk & sub-induk; rincian/leaf
-- dapat dibiarkan kosong.
ALTER TABLE jenis_retribusi ADD COLUMN kode_rekening TEXT NOT NULL DEFAULT '';
