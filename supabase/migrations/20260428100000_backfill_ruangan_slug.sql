-- Isi slug URL untuk baris master ruangan yang masih kosong (redirect login /{slug}/dashboard).

-- 1) Baris seed multi-unit (UUID tetap dari migrasi 20260424100000)
UPDATE public.ruangan SET slug = 'idik' WHERE id = '00000000-0000-0000-0000-000000000001' AND (slug IS NULL OR trim(slug) = '');
UPDATE public.ruangan SET slug = 'iccu' WHERE id = '00000000-0000-0000-0000-000000000002' AND (slug IS NULL OR trim(slug) = '');
UPDATE public.ruangan SET slug = 'icu' WHERE id = '00000000-0000-0000-0000-000000000003' AND (slug IS NULL OR trim(slug) = '');
UPDATE public.ruangan SET slug = 'hcu' WHERE id = '00000000-0000-0000-0000-000000000004' AND (slug IS NULL OR trim(slug) = '');
UPDATE public.ruangan SET slug = 'micu' WHERE id = '00000000-0000-0000-0000-000000000005' AND (slug IS NULL OR trim(slug) = '');
UPDATE public.ruangan SET slug = 'su' WHERE id = '00000000-0000-0000-0000-000000000006' AND (slug IS NULL OR trim(slug) = '');

-- 2) Satu baris “ICCU” tanpa slug → iccu (jika slug belum dipakai baris lain)
WITH pick AS (
  SELECT id FROM public.ruangan
  WHERE (slug IS NULL OR trim(slug) = '')
    AND trim(nama) ILIKE 'iccu%'
    AND NOT EXISTS (SELECT 1 FROM public.ruangan x WHERE x.slug = 'iccu')
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.ruangan r SET slug = 'iccu' FROM pick p WHERE r.id = p.id;

-- 3) MICU (sebelum ICU agar tidak tertelan pola ICU)
WITH pick AS (
  SELECT id FROM public.ruangan
  WHERE (slug IS NULL OR trim(slug) = '')
    AND trim(nama) ILIKE '%micu%'
    AND NOT EXISTS (SELECT 1 FROM public.ruangan x WHERE x.slug = 'micu')
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.ruangan r SET slug = 'micu' FROM pick p WHERE r.id = p.id;

-- 4) ICU (bukan ICCU / MICU)
WITH pick AS (
  SELECT id FROM public.ruangan
  WHERE (slug IS NULL OR trim(slug) = '')
    AND trim(nama) ILIKE 'icu%'
    AND trim(nama) NOT ILIKE 'iccu%'
    AND trim(nama) NOT ILIKE '%micu%'
    AND NOT EXISTS (SELECT 1 FROM public.ruangan x WHERE x.slug = 'icu')
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.ruangan r SET slug = 'icu' FROM pick p WHERE r.id = p.id;

-- 5) HCU
WITH pick AS (
  SELECT id FROM public.ruangan
  WHERE (slug IS NULL OR trim(slug) = '')
    AND (trim(nama) ILIKE 'hcu%' OR trim(nama) ILIKE '% hcu %' OR trim(nama) ILIKE '%(hcu)%')
    AND NOT EXISTS (SELECT 1 FROM public.ruangan x WHERE x.slug = 'hcu')
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.ruangan r SET slug = 'hcu' FROM pick p WHERE r.id = p.id;

-- 6) Stroke Unit
WITH pick AS (
  SELECT id FROM public.ruangan
  WHERE (slug IS NULL OR trim(slug) = '')
    AND (trim(nama) ILIKE 'stroke%' OR trim(nama) ILIKE '%stroke unit%')
    AND NOT EXISTS (SELECT 1 FROM public.ruangan x WHERE x.slug = 'su')
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.ruangan r SET slug = 'su' FROM pick p WHERE r.id = p.id;

-- 7) IDIK / Cathlab
WITH pick AS (
  SELECT id FROM public.ruangan
  WHERE (slug IS NULL OR trim(slug) = '')
    AND (trim(nama) ILIKE '%idik%' OR trim(nama) ILIKE '%cathlab%')
    AND NOT EXISTS (SELECT 1 FROM public.ruangan x WHERE x.slug = 'idik')
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.ruangan r SET slug = 'idik' FROM pick p WHERE r.id = p.id;

-- 8) IGD
WITH pick AS (
  SELECT id FROM public.ruangan
  WHERE (slug IS NULL OR trim(slug) = '')
    AND trim(nama) ILIKE '%igd%'
    AND NOT EXISTS (SELECT 1 FROM public.ruangan x WHERE x.slug = 'igd')
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.ruangan r SET slug = 'igd' FROM pick p WHERE r.id = p.id;

-- 9) Rawat inap
WITH pick AS (
  SELECT id FROM public.ruangan
  WHERE (slug IS NULL OR trim(slug) = '')
    AND (trim(nama) ILIKE '%rawat inap%' OR trim(nama) ILIKE '%ranap%')
    AND NOT EXISTS (SELECT 1 FROM public.ruangan x WHERE x.slug = 'rawat-inap')
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
UPDATE public.ruangan r SET slug = 'rawat-inap' FROM pick p WHERE r.id = p.id;
