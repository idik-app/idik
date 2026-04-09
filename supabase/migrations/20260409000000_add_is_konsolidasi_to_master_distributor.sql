-- Tambahkan kolom is_konsolidasi ke master_distributor jika belum ada
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='master_distributor' AND column_name='is_konsolidasi') THEN
        ALTER TABLE public.master_distributor ADD COLUMN is_konsolidasi BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
