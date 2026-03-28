-- Skema remote kadang belum punya kolom ini meski ada di migrasi awal; selaras dengan PATCH / drawer.

alter table public.tindakan add column if not exists diagnosa text;

comment on column public.tindakan.diagnosa is 'Diagnosis kasus Cathlab (teks).';
