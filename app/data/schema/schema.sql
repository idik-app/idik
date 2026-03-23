-- schema.sql
CREATE TABLE pasien (
  id TEXT PRIMARY KEY,
  nama TEXT,
  umur INTEGER,
  diagnosis TEXT
);

CREATE TABLE tindakan (
  id TEXT PRIMARY KEY,
  nama TEXT,
  kategori TEXT,
  tarif NUMERIC,
  dokterId TEXT,
  pasienId TEXT,
  tanggal TEXT
);
