-- Metrik radiologi per kasus (drawer tab Radiologi — edit autosave).
alter table public.tindakan add column if not exists fluoro_time numeric;
alter table public.tindakan add column if not exists dose numeric;
alter table public.tindakan add column if not exists kv numeric;
alter table public.tindakan add column if not exists ma numeric;

comment on column public.tindakan.fluoro_time is 'Fluoro time: total detik; UI format H:MM:SS (mis. 0:10:45).';
comment on column public.tindakan.dose is 'Dosis radiasi (mis. mGy·m²).';
comment on column public.tindakan.kv is 'Tegangan tabung (kV).';
comment on column public.tindakan.ma is 'Arus tabung (mA).';
