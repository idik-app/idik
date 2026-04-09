-- Script Pembersihan Duplikasi Distributor (Versi Agresif)
-- Menangani: Case-insensitive, spasi ganda, variasi "PT.", dan karakter non-standar (Homoglyph)

DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    -- 1. Buat tabel temporary untuk pemetaan ID
    CREATE TEMP TABLE pt_mapping (
        old_id UUID,
        new_id UUID
    );

    -- 2. Identifikasi duplikat dengan normalisasi mendalam
    -- Normalisasi: Uppercase, hapus "PT.", hapus spasi ganda, trim, dan handle karakter unik
    FOR r IN (
        WITH normalized_list AS (
            SELECT 
                id,
                nama_pt,
                is_konsolidasi,
                created_at,
                regexp_replace(
                    regexp_replace(
                        upper(trim(nama_pt)), 
                        '^PT\.?\s*', ''
                    ),
                    '\s+', ' ', 'g'
                ) as norm_name
            FROM public.master_distributor
        )
        SELECT 
            norm_name,
            -- Pilih ID yang akan dipertahankan (prioritas: yang is_konsolidasi=true, lalu yang paling lama/created_at terkecil)
            (SELECT id FROM normalized_list nl2 
             WHERE nl2.norm_name = nl.norm_name 
             ORDER BY is_konsolidasi DESC, created_at ASC LIMIT 1) as keep_id,
            array_agg(id) as all_ids
        FROM normalized_list nl
        GROUP BY norm_name
        HAVING count(*) > 1
    ) LOOP
        -- Masukkan semua ID duplikat ke mapping
        INSERT INTO pt_mapping (old_id, new_id)
        SELECT unnest(r.all_ids), r.keep_id;
        
        -- Update nama PT yang dipertahankan agar seragam (PT. + NAMA BERSIH)
        UPDATE public.master_distributor 
        SET nama_pt = 'PT. ' || r.norm_name 
        WHERE id = r.keep_id;
    END LOOP;

    -- 3. Update referensi di tabel-tabel terkait
    
    -- app_users
    UPDATE public.app_users u
    SET distributor_id = m.new_id
    FROM pt_mapping m
    WHERE u.distributor_id = m.old_id AND m.old_id != m.new_id;

    -- inventaris
    UPDATE public.inventaris i
    SET distributor_id = m.new_id
    FROM pt_mapping m
    WHERE i.distributor_id = m.old_id AND m.old_id != m.new_id;

    -- master_barang
    UPDATE public.master_barang b
    SET distributor_id = m.new_id
    FROM pt_mapping m
    WHERE b.distributor_id = m.old_id AND m.old_id != m.new_id;

    -- distributor_notification_settings
    DELETE FROM public.distributor_notification_settings s
    USING pt_mapping m
    WHERE s.distributor_id = m.old_id AND m.old_id != m.new_id
    AND EXISTS (SELECT 1 FROM public.distributor_notification_settings s2 WHERE s2.distributor_id = m.new_id);

    UPDATE public.distributor_notification_settings s
    SET distributor_id = m.new_id
    FROM pt_mapping m
    WHERE s.distributor_id = m.old_id AND m.old_id != m.new_id;

    -- 4. Hapus distributor duplikat yang sudah tidak terpakai
    DELETE FROM public.master_distributor
    WHERE id IN (SELECT old_id FROM pt_mapping WHERE old_id != new_id);

    -- 5. Normalisasi nama untuk distributor yang TIDAK duplikat (agar semuanya seragam)
    UPDATE public.master_distributor
    SET nama_pt = 'PT. ' || regexp_replace(regexp_replace(upper(trim(nama_pt)), '^PT\.?\s*', ''), '\s+', ' ', 'g')
    WHERE nama_pt NOT LIKE 'PT. %' OR nama_pt != upper(nama_pt);

    DROP TABLE pt_mapping;
END $$;
