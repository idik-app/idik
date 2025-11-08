-- ============================================================
-- Cathlab IDIK-App Database Schema
-- Versi 3.1 Gold-Cyan Hybrid (JARVIS Mode)
-- ============================================================

-- ================== TABLE: DOCTOR ==================
CREATE TABLE IF NOT EXISTS public.doctor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_dokter TEXT NOT NULL,
  spesialis TEXT,
  nomor_str TEXT,
  nomor_sip TEXT,
  kontak TEXT,
  email TEXT,
  status_aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doctor_nama
  ON public.doctor (LOWER(nama_dokter));

-- ================== TABLE: TINDAKAN ==================
CREATE TABLE IF NOT EXISTS public.tindakan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_tindakan TEXT NOT NULL,
  kategori_tindakan TEXT,
  tarif NUMERIC(12,2),
  durasi_menit INT,
  keterangan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tindakan_nama
  ON public.tindakan (LOWER(nama_tindakan));

-- ================== TABLE: PASIEN ==================
CREATE TABLE IF NOT EXISTS public.pasien (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_rm TEXT NOT NULL,
  nama_pasien TEXT NOT NULL,
  dokter_id UUID REFERENCES public.doctor (id) ON DELETE SET NULL,
  tindakan_id UUID REFERENCES public.tindakan (id) ON DELETE SET NULL,
  tanggal_mrs DATE,
  tanggal_tindakan DATE NOT NULL,
  usia INT,
  jenis_kelamin TEXT CHECK (jenis_kelamin IN ('L','P')),
  status_rawat TEXT CHECK (status_rawat IN ('Rawat Jalan','Rawat Inap','Cito')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (no_rm, tanggal_tindakan)
);

CREATE INDEX IF NOT EXISTS idx_pasien_dokter ON public.pasien (dokter_id);
CREATE INDEX IF NOT EXISTS idx_pasien_tanggal ON public.pasien (tanggal_tindakan);

-- ================== TRIGGER: UPDATED_AT ==================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_doctor_updated
BEFORE UPDATE ON public.doctor
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_pasien_updated
BEFORE UPDATE ON public.pasien
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_tindakan_updated
BEFORE UPDATE ON public.tindakan
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================== VIEW: Statistik Per Dokter ==================
CREATE OR REPLACE VIEW public.vw_statistik_dokter AS
SELECT
  d.id AS dokter_id,
  d.nama_dokter,
  COUNT(p.id) AS total_pasien,
  COUNT(DISTINCT p.tindakan_id) AS jenis_tindakan,
  MIN(p.tanggal_tindakan) AS pertama_tindakan,
  MAX(p.tanggal_tindakan) AS terakhir_tindakan
FROM public.doctor d
LEFT JOIN public.pasien p ON d.id = p.dokter_id
GROUP BY d.id, d.nama_dokter
ORDER BY total_pasien DESC;

-- ================== SECURITY (optional, enable if RLS) ==================
-- ALTER TABLE public.doctor ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.pasien ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tindakan ENABLE ROW LEVEL SECURITY;
-- Example policies:
-- CREATE POLICY admin_all ON public.doctor FOR ALL USING (auth.role() = 'admin');
-- CREATE POLICY doctor_read_own ON public.pasien FOR SELECT USING (auth.uid() = dokter_id);

-- ============================================================
-- END OF Cathlab IDIK-App Schema
-- ============================================================
