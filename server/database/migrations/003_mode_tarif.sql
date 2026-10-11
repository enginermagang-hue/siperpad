-- Mode input entri mingguan: 'langsung' (nilai Rp) atau 'kuantitas' (unit x tarif).
ALTER TABLE jenis_retribusi ADD COLUMN mode_tarif TEXT NOT NULL DEFAULT 'langsung';
-- Satuan kuantitas (info): hari, orang, unit, tiket, ...
ALTER TABLE jenis_retribusi ADD COLUMN satuan TEXT NOT NULL DEFAULT '';

-- Metadata kuantitas & tarif saat transaksi (jejak historis).
-- `jumlah` tetap disimpan sebagai Rupiah = round(kuantitas * tarif).
ALTER TABLE realisasi ADD COLUMN kuantitas INTEGER;
ALTER TABLE realisasi ADD COLUMN tarif INTEGER;
