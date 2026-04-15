-- Migration: Add Kelengkapan fields to tindakan table
-- Created at: 2026-04-15 10:00:00

-- 1. Tambah kolom ke tabel utama (base table)
ALTER TABLE public.tindakan 
ADD COLUMN IF NOT EXISTS asmed TEXT,
ADD COLUMN IF NOT EXISTS resume_erm TEXT,
ADD COLUMN IF NOT EXISTS sjp TEXT,
ADD COLUMN IF NOT EXISTS berkas_laporan TEXT,
ADD COLUMN IF NOT EXISTS consumable_kelengkapan TEXT,
ADD COLUMN IF NOT EXISTS billing_simrs TEXT,
ADD COLUMN IF NOT EXISTS pj_laporan TEXT,
ADD COLUMN IF NOT EXISTS operan_ranap TEXT;

-- 2. Update tindakan_medik secara dinamis berdasarkan tipenya (Table atau View)
DO $$ 
DECLARE
    v_type char;
BEGIN
    -- Ambil tipe objek: 'r' untuk table, 'v' untuk view
    SELECT relkind INTO v_type 
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace 
    WHERE n.nspname = 'public' AND c.relname = 'tindakan_medik';

    IF v_type = 'r' THEN
        -- Jika ternyata TABEL, tambah kolom langsung ke tabel tersebut
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS asmed TEXT;
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS resume_erm TEXT;
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS sjp TEXT;
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS berkas_laporan TEXT;
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS consumable_kelengkapan TEXT;
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS billing_simrs TEXT;
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS pj_laporan TEXT;
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS operan_ranap TEXT;
    ELSIF v_type = 'v' THEN
        -- Jika VIEW, drop dulu baru buat ulang agar kolom baru terbaca
        DROP VIEW public.tindakan_medik CASCADE;
        
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'tindakan' AND column_name = 'dokter_id'
        ) THEN
            EXECUTE 'CREATE VIEW public.tindakan_medik AS 
                     SELECT t.*, d.nama_dokter AS dokter 
                     FROM public.tindakan t 
                     LEFT JOIN public.doctor d ON d.id = t.dokter_id';
        ELSE
            EXECUTE 'CREATE VIEW public.tindakan_medik AS SELECT * FROM public.tindakan';
        END IF;
    END IF;
END $$;

-- 3. Tambahkan komentar untuk dokumentasi
COMMENT ON COLUMN public.tindakan.asmed IS 'Status kelengkapan Asesmen Medis';
COMMENT ON COLUMN public.tindakan.resume_erm IS 'Status kelengkapan Resume e-RM';
COMMENT ON COLUMN public.tindakan.sjp IS 'Status kelengkapan SJP';
COMMENT ON COLUMN public.tindakan.berkas_laporan IS 'Status kelengkapan Berkas Laporan';
COMMENT ON COLUMN public.tindakan.consumable_kelengkapan IS 'Status kelengkapan Consumable';
COMMENT ON COLUMN public.tindakan.billing_simrs IS 'Status kelengkapan Billing SIMRS';
COMMENT ON COLUMN public.tindakan.pj_laporan IS 'Status kelengkapan PJ Laporan';
COMMENT ON COLUMN public.tindakan.operan_ranap IS 'Status kelengkapan Operan dengan Ranap';
