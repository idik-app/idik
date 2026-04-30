-- Rekapitulasi ICCU per tahun — agregasi dari iccu_register_entry (REGISTER + HISTORY).
-- Tanggal acuan per baris: coalesce(archived_at::date, periode_keluar, created_at::date).

create or replace function public.iccu_register_payment_bucket(jenis text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when jenis is null or trim(jenis) = '' then 'lain'
    when upper(jenis) like '%NPBI%' then 'npbi'
    when upper(jenis) like '%BPJS%'
      or upper(jenis) like '%PBI%'
      or upper(jenis) like '%JKN%' then 'bpjs_pbi'
    when upper(jenis) like '%UMUM%'
      or upper(jenis) like '%BAYAR%' then 'umum'
    when upper(jenis) like '%JKS%'
      or upper(jenis) like '%JAMPERSAL%'
      or upper(jenis) like '%JAMKESMAS%' then 'rjks'
    else 'lain'
  end;
$$;

comment on function public.iccu_register_payment_bucket(text) is
  'Kategori pembayaran untuk rekapitulasi Section A (kasar; sesuaikan dengan master SIMRS jika perlu).';

create or replace function public.iccu_register_diagnosa_bucket(diagnosa text)
returns text
language sql
immutable
parallel safe
as $$
  select case
    when diagnosa is null or trim(diagnosa) = '' then 'NON CARDIO'
    when upper(diagnosa) like '%NSTEMI%' then 'NSTEMI'
    when upper(diagnosa) like '%STEMI%' then 'STEMI'
    when upper(diagnosa) like '%UAP%' then 'UAP'
    when upper(diagnosa) like '%SVT%' then 'SVT'
    when upper(diagnosa) like '% DC %'
      or upper(diagnosa) like '%DC,%'
      or upper(diagnosa) like 'DC %'
      or upper(diagnosa) like '% DISEASE%' then 'DC'
    when upper(diagnosa) like '%HYPERTENS%' or upper(diagnosa) like '% HT %' or upper(diagnosa) like 'HT %' then 'HT'
    when upper(diagnosa) like '%AV BLOCK%' or upper(diagnosa) like '%BLOCK%' then 'AV BLOCK'
    when upper(diagnosa) like '% AF %' or upper(diagnosa) like 'AF %' or upper(diagnosa) like '% A.F%' then 'AF'
    else 'NON CARDIO'
  end;
$$;

comment on function public.iccu_register_diagnosa_bucket(text) is
  'Bucket diagnosis untuk Section D (heuristik string).';

create or replace function public.iccu_rekap_year_payload(p_ruangan_id uuid, p_year integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with base as (
    select
      e.id,
      coalesce(
        (e.archived_at at time zone 'utc')::date,
        e.periode_keluar,
        (e.created_at at time zone 'utc')::date
      ) as rekap_day,
      public.iccu_register_payment_bucket(e.jenis_pembiayaan) as pay_bucket,
      e.cara_keluar,
      e.meninggal_within_48h,
      e.los_hari,
      e.invasive_procedures,
      public.iccu_register_diagnosa_bucket(e.diagnosa) as diag_bucket,
      e.diagnosa
    from public.iccu_register_entry e
    where e.ruangan_id = p_ruangan_id
      and extract(
        year from coalesce(
          (e.archived_at at time zone 'utc')::date,
          e.periode_keluar,
          (e.created_at at time zone 'utc')::date
        )
      )::int = p_year
  ),
  monthly as (
    select
      extract(month from rekap_day)::int as mo,
      count(*) filter (where pay_bucket = 'umum')::bigint as umum,
      count(*) filter (where pay_bucket = 'bpjs_pbi')::bigint as bpjs_pbi,
      count(*) filter (where pay_bucket = 'npbi')::bigint as npbi,
      count(*) filter (where pay_bucket = 'rjks')::bigint as rjks,
      count(*) filter (where pay_bucket = 'lain')::bigint as lain,
      count(*) filter (where cara_keluar = 'meninggal')::bigint as meninggal,
      count(*) filter (
        where cara_keluar = 'meninggal' and meninggal_within_48h is true
      )::bigint as meninggal_lt48,
      count(*) filter (
        where cara_keluar = 'meninggal' and meninggal_within_48h is not true
      )::bigint as meninggal_gt48,
      count(*) filter (where cara_keluar = 'rujuk')::bigint as dirujuk,
      count(*) filter (where cara_keluar = 'pulang_paksa')::bigint as pulang_paksa,
      count(*) filter (where cara_keluar = 'pindah_ruangan')::bigint as pindah_ruangan,
      count(*) filter (where cara_keluar = 'krs')::bigint as krs,
      count(*) filter (
        where invasive_procedures @> '["ventilator"]'::jsonb
      )::bigint as ventilator,
      count(*) filter (where invasive_procedures @> '["cvc"]'::jsonb)::bigint as cvc,
      count(*) filter (where invasive_procedures @> '["pdt"]'::jsonb)::bigint as pdt,
      count(*) filter (
        where invasive_procedures @> '["dca"]'::jsonb
          or invasive_procedures @> '["ptca"]'::jsonb
      )::bigint as dca_ptca,
      count(*) filter (where invasive_procedures @> '["streptase"]'::jsonb)::bigint as trombolitik,
      count(*) filter (where invasive_procedures @> '["tpm"]'::jsonb)::bigint as tpm,
      count(*) filter (where invasive_procedures @> '["ppm"]'::jsonb)::bigint as ppm,
      count(*) filter (
        where invasive_procedures @> '["pericardiosintesis"]'::jsonb
      )::bigint as perikardiosintesis,
      count(*) filter (where invasive_procedures @> '["ablasi"]'::jsonb)::bigint as ablasi,
      coalesce(sum(los_hari) filter (where los_hari is not null), 0)::bigint as sum_los_hari,
      count(*) filter (where los_hari is not null)::bigint as los_rows,
      count(*) filter (where diag_bucket = 'STEMI')::bigint as d_stemi,
      count(*) filter (where diag_bucket = 'NSTEMI')::bigint as d_nstemi,
      count(*) filter (where diag_bucket = 'UAP')::bigint as d_uap,
      count(*) filter (where diag_bucket = 'SVT')::bigint as d_svt,
      count(*) filter (where diag_bucket = 'DC')::bigint as d_dc,
      count(*) filter (where diag_bucket = 'HT')::bigint as d_ht,
      count(*) filter (where diag_bucket = 'AV BLOCK')::bigint as d_avblock,
      count(*) filter (where diag_bucket = 'AF')::bigint as d_af,
      count(*) filter (where diag_bucket = 'NON CARDIO')::bigint as d_non_cardio
    from base
    group by extract(month from rekap_day)::int
  ),
  filled as (
    select
      gs.m as mo,
      coalesce(monthly.umum, 0) as umum,
      coalesce(monthly.bpjs_pbi, 0) as bpjs_pbi,
      coalesce(monthly.npbi, 0) as npbi,
      coalesce(monthly.rjks, 0) as rjks,
      coalesce(monthly.lain, 0) as lain,
      coalesce(monthly.meninggal, 0) as meninggal,
      coalesce(monthly.meninggal_lt48, 0) as meninggal_lt48,
      coalesce(monthly.meninggal_gt48, 0) as meninggal_gt48,
      coalesce(monthly.dirujuk, 0) as dirujuk,
      coalesce(monthly.pulang_paksa, 0) as pulang_paksa,
      coalesce(monthly.pindah_ruangan, 0) as pindah_ruangan,
      coalesce(monthly.krs, 0) as krs,
      coalesce(monthly.ventilator, 0) as ventilator,
      coalesce(monthly.cvc, 0) as cvc,
      coalesce(monthly.pdt, 0) as pdt,
      coalesce(monthly.dca_ptca, 0) as dca_ptca,
      coalesce(monthly.trombolitik, 0) as trombolitik,
      coalesce(monthly.tpm, 0) as tpm,
      coalesce(monthly.ppm, 0) as ppm,
      coalesce(monthly.perikardiosintesis, 0) as perikardiosintesis,
      coalesce(monthly.ablasi, 0) as ablasi,
      coalesce(monthly.sum_los_hari, 0) as sum_los_hari,
      coalesce(monthly.los_rows, 0) as los_rows,
      coalesce(monthly.d_stemi, 0) as d_stemi,
      coalesce(monthly.d_nstemi, 0) as d_nstemi,
      coalesce(monthly.d_uap, 0) as d_uap,
      coalesce(monthly.d_svt, 0) as d_svt,
      coalesce(monthly.d_dc, 0) as d_dc,
      coalesce(monthly.d_ht, 0) as d_ht,
      coalesce(monthly.d_avblock, 0) as d_avblock,
      coalesce(monthly.d_af, 0) as d_af,
      coalesce(monthly.d_non_cardio, 0) as d_non_cardio
    from generate_series(1, 12) as gs(m)
    left join monthly on monthly.mo = gs.m
  )
  select jsonb_build_object(
    'year',
    p_year,
    'months',
      coalesce(
      jsonb_agg(
        jsonb_build_object(
          'month',
          filled.mo,
          'section_a',
          jsonb_build_object(
            'umum',
            filled.umum,
            'bpjs_pbi',
            filled.bpjs_pbi,
            'npbi',
            filled.npbi,
            'rjks',
            filled.rjks,
            'lain',
            filled.lain
          ),
          'section_b',
          jsonb_build_object(
            'meninggal',
            filled.meninggal,
            'meninggal_lt48',
            filled.meninggal_lt48,
            'meninggal_gt48',
            filled.meninggal_gt48,
            'dirujuk',
            filled.dirujuk,
            'pulang_paksa',
            filled.pulang_paksa,
            'pindah_ruangan',
            filled.pindah_ruangan,
            'krs',
            filled.krs,
            'ventilator',
            filled.ventilator,
            'cvc',
            filled.cvc,
            'pdt',
            filled.pdt,
            'dca_ptca',
            filled.dca_ptca,
            'trombolitik',
            filled.trombolitik,
            'tpm',
            filled.tpm,
            'ppm',
            filled.ppm,
            'perikardiosintesis',
            filled.perikardiosintesis,
            'ablasi',
            filled.ablasi,
            'sum_los_hari',
            filled.sum_los_hari,
            'los_rows',
            filled.los_rows
          ),
          'section_c',
          jsonb_build_object(
            'note',
            'BOR/TOI/BTO penuh memerlukan kapasitas TT dan denominator RS — placeholder untuk integrasi.',
            'avg_los_hari',
            case
              when filled.los_rows > 0 then round(filled.sum_los_hari::numeric / filled.los_rows::numeric, 2)
              else null
            end
          ),
          'section_d',
          jsonb_build_object(
            'STEMI',
            filled.d_stemi,
            'NSTEMI',
            filled.d_nstemi,
            'UAP',
            filled.d_uap,
            'SVT',
            filled.d_svt,
            'DC',
            filled.d_dc,
            'HT',
            filled.d_ht,
            'AV BLOCK',
            filled.d_avblock,
            'AF',
            filled.d_af,
            'NON CARDIO',
            filled.d_non_cardio
          )
        ) order by filled.mo
      ),
      '[]'::jsonb
    )
  )
  from filled;
$$;

comment on function public.iccu_rekap_year_payload(uuid, integer) is
  'JSON rekapitulasi ICCU 12 bulan untuk satu ruangan & tahun (dasar register).';

revoke all on function public.iccu_register_payment_bucket(text) from public;
revoke all on function public.iccu_register_diagnosa_bucket(text) from public;
revoke all on function public.iccu_rekap_year_payload(uuid, integer) from public;

grant execute on function public.iccu_register_payment_bucket(text) to service_role;
grant execute on function public.iccu_register_diagnosa_bucket(text) to service_role;
grant execute on function public.iccu_rekap_year_payload(uuid, integer) to service_role;

grant execute on function public.iccu_register_payment_bucket(text) to authenticated;
grant execute on function public.iccu_register_diagnosa_bucket(text) to authenticated;
grant execute on function public.iccu_rekap_year_payload(uuid, integer) to authenticated;
