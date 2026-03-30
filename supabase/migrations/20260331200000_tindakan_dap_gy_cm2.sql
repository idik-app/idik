-- DAP (Dose Area Product), Gy·cm² — tab Radiologi drawer tindakan.
alter table public.tindakan add column if not exists dap_gy_cm2 numeric;

comment on column public.tindakan.dap_gy_cm2 is 'DAP — Dose Area Product (Gy·cm²).';
