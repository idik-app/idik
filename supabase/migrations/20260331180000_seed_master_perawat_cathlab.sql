-- Seed master perawat Cathlab (idempotent: lewati jika nama sudah ada).

insert into public.master_perawat (nama_perawat, bidang, aktif)
select v.nama, null, true
from (
  values
    ('Neti Siskasari, S.Kep.,Ns'),
    ('Habibur Rahman, S.Kep.,Ns'),
    ('Nisayyadi Efendi, S.Kep., Ns'),
    ('Roby Andika Dzikri, A.Md.Kep'),
    ('Aziza, A.Md.Kep'),
    ('Rommy Putra Perdana, A.Md.Kep'),
    ('Dian Nanda Birawa, A.Md.Kep')
) as v(nama)
where not exists (
  select 1
  from public.master_perawat m
  where trim(m.nama_perawat) = trim(v.nama)
);
