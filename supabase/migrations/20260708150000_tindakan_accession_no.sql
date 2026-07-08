-- 1. Tambah kolom ke tabel utama (base table)
ALTER TABLE public.tindakan ADD COLUMN IF NOT EXISTS accession_no TEXT;

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
        ALTER TABLE public.tindakan_medik ADD COLUMN IF NOT EXISTS accession_no TEXT;
    ELSIF v_type = 'v' THEN
        -- Jika VIEW, drop dulu baru buat ulang agar kolom baru terbaca
        DROP VIEW IF EXISTS public.tindakan_medik CASCADE;
        
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
