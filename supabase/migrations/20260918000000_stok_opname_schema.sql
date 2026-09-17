-- Migrasi Database Supabase: Modul Stok Opname Alat Medis & Non-Medis

CREATE TABLE IF NOT EXISTS public.stok_opname_sesi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_sesi TEXT NOT NULL UNIQUE,
    lokasi TEXT NOT NULL DEFAULT 'Cathlab',
    jenis_kategori TEXT NOT NULL DEFAULT 'Semua',
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Pending_Approval, Approved, Rejected
    catatan TEXT,
    total_sku INT NOT NULL DEFAULT 0,
    total_fisik INT NOT NULL DEFAULT 0,
    total_selisih INT NOT NULL DEFAULT 0,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by TEXT,
    approved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.stok_opname_item (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sesi_id UUID NOT NULL REFERENCES public.stok_opname_sesi(id) ON DELETE CASCADE,
    barang_id TEXT,
    kode_barcode TEXT NOT NULL,
    nama_barang TEXT NOT NULL,
    kategori TEXT NOT NULL DEFAULT 'Medis', -- Medis, Non-Medis
    satuan TEXT DEFAULT 'Pcs',
    lot_number TEXT,
    expired_date DATE,
    stok_sistem INT NOT NULL DEFAULT 0,
    stok_fisik INT NOT NULL DEFAULT 0,
    selisih INT NOT NULL DEFAULT 0, -- stok_fisik - stok_sistem
    status_ed TEXT NOT NULL DEFAULT 'Aman', -- Aman, Mendekati, Expired, Non-ED
    catatan TEXT,
    scanned_by_user TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing untuk performa pencarian & filter periode bulan
CREATE INDEX IF NOT EXISTS idx_stok_opname_sesi_created_at ON public.stok_opname_sesi (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stok_opname_sesi_lokasi ON public.stok_opname_sesi (lokasi);
CREATE INDEX IF NOT EXISTS idx_stok_opname_sesi_status ON public.stok_opname_sesi (status);

CREATE INDEX IF NOT EXISTS idx_stok_opname_item_sesi_id ON public.stok_opname_item (sesi_id);
CREATE INDEX IF NOT EXISTS idx_stok_opname_item_barcode ON public.stok_opname_item (kode_barcode);
CREATE INDEX IF NOT EXISTS idx_stok_opname_item_ed ON public.stok_opname_item (expired_date);

-- Enable RLS
ALTER TABLE public.stok_opname_sesi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stok_opname_item ENABLE ROW LEVEL SECURITY;

-- Policy sederhana (bisa diakses publik / terautentikasi)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read write stok_opname_sesi') THEN
        CREATE POLICY "Allow public read write stok_opname_sesi" ON public.stok_opname_sesi FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public read write stok_opname_item') THEN
        CREATE POLICY "Allow public read write stok_opname_item" ON public.stok_opname_item FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
