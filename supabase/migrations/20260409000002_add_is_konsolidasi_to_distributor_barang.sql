-- Tambahkan kolom is_konsolidasi ke distributor_barang jika belum ada
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema='public' AND table_name='distributor_barang' AND column_name='is_konsolidasi') THEN
        ALTER TABLE public.distributor_barang ADD COLUMN is_konsolidasi BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
