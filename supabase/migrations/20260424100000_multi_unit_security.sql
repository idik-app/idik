-- 🏨 IDIK-App Multi-Unit Migration
-- Transisi dari Single Unit (IDIK) ke Multi-Unit Platform

-- 1. Tabel Ruangan / Unit
ALTER TABLE IF EXISTS public.ruangan 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"flowsheet": true}',
ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{"primaryColor": "#3b82f6", "displayName": "Unit Medis"}',
ADD COLUMN IF NOT EXISTS clinical_config JSONB DEFAULT '{}';

-- Create default rooms
INSERT INTO public.ruangan (id, nama, slug, branding, capabilities)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Cathlab / IDIK', 'idik', '{"primaryColor": "#3b82f6", "displayName": "IDIK / Cathlab"}', '{"flowsheet": true, "catheter": true}'),
    ('00000000-0000-0000-0000-000000000002', 'ICCU (Intensive Cardio Care Unit)', 'iccu', '{"primaryColor": "#ef4444", "displayName": "ICCU"}', '{"flowsheet": true, "cardiac": true}'),
    ('00000000-0000-0000-0000-000000000003', 'ICU (Intensive Care Unit)', 'icu', '{"primaryColor": "#dc2626", "displayName": "ICU"}', '{"flowsheet": true, "ventilator": true}'),
    ('00000000-0000-0000-0000-000000000004', 'HCU (High Care Unit)', 'hcu', '{"primaryColor": "#f59e0b", "displayName": "HCU"}', '{"flowsheet": true}'),
    ('00000000-0000-0000-0000-000000000005', 'MICU (Medical Intensive Care Unit)', 'micu', '{"primaryColor": "#8b5cf6", "displayName": "MICU"}', '{"flowsheet": true, "ventilator": true}'),
    ('00000000-0000-0000-0000-000000000006', 'Stroke Unit (SU)', 'su', '{"primaryColor": "#10b981", "displayName": "Stroke Unit"}', '{"flowsheet": true, "neurology": true}')
ON CONFLICT (slug) DO NOTHING;

-- 2. Tabel Akses User ke Unit
CREATE TABLE IF NOT EXISTS public.user_unit_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ruangan_id UUID REFERENCES public.ruangan(id) ON DELETE CASCADE,
    role_id TEXT, -- Opsional: role spesifik di unit ini
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, ruangan_id)
);

-- 3. Row-Level Security (RLS)
-- Aktifkan RLS pada tabel sensitif
ALTER TABLE public.intensive_flow_sheet ENABLE ROW LEVEL SECURITY;

-- Kebijakan: User hanya bisa melihat flowsheet jika punya akses ke ruangan terkait
-- Catatan: intensive_flow_sheet butuh link ke ruangan_id jika ingin RLS murni.
-- Untuk sekarang, kita tambahkan kolom ruangan_id ke intensive_flow_sheet.
ALTER TABLE public.intensive_flow_sheet 
ADD COLUMN IF NOT EXISTS ruangan_id UUID REFERENCES public.ruangan(id);

DROP POLICY IF EXISTS "Unit access policy" ON public.intensive_flow_sheet;
CREATE POLICY "Unit access policy" ON public.intensive_flow_sheet
    FOR ALL
    USING (
        ruangan_id IN (
            SELECT ruangan_id FROM public.user_unit_access WHERE user_id = auth.uid()
        )
        OR (SELECT role FROM auth.users WHERE id = auth.uid()) IN ('admin', 'administrator', 'superadmin')
    );

-- 4. Backfilling Data Lama
-- Memastikan data lama tetap muncul di dashboard dengan memetakan ke unit yang sesuai

-- Gunakan blok DO untuk logika kondisional
DO $$ 
DECLARE
    idik_id UUID;
BEGIN
    -- Ambil ID unit default (IDIK)
    SELECT id INTO idik_id FROM public.ruangan WHERE slug = 'idik' LIMIT 1;

    -- Update data flowsheet berdasarkan kolom 'ruangan' di tabel tindakan (jika ada relasi)
    UPDATE public.intensive_flow_sheet ifs
    SET ruangan_id = r.id
    FROM public.tindakan t
    JOIN public.ruangan r ON (t.ruangan ILIKE '%' || r.slug || '%' OR t.ruangan ILIKE '%' || r.nama || '%')
    WHERE ifs.tindakan_id = t.id::text
    AND ifs.ruangan_id IS NULL;

    -- Sisanya yang tidak terpetakan, masukkan ke IDIK (Cathlab) agar tidak hilang
    UPDATE public.intensive_flow_sheet
    SET ruangan_id = idik_id
    WHERE ruangan_id IS NULL;
END $$;
