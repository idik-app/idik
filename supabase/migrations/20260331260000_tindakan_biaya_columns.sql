-- Kolom tab Biaya pada kasus tindakan (Total, KRS, Selisih, Consumable, Pemakaian teks)

alter table public.tindakan add column if not exists total numeric(14, 2);
alter table public.tindakan add column if not exists krs text;
alter table public.tindakan add column if not exists selisih numeric(14, 2);
alter table public.tindakan add column if not exists consumable numeric(14, 2);
alter table public.tindakan add column if not exists pemakaian text;

comment on column public.tindakan.total is 'Total biaya kasus (rupiah, opsional).';
comment on column public.tindakan.krs is 'KRS / referensi klaim (teks).';
comment on column public.tindakan.selisih is 'Selisih biaya (rupiah).';
comment on column public.tindakan.consumable is 'Nilai consumable (rupiah).';
comment on column public.tindakan.pemakaian is 'Ringkasan/teks pemakaian alkes (tab Biaya).';
