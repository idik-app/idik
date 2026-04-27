-- Tab Biaya: simpan override kelas/jenis (mis. "Umum - 2") per kasus, selain fallback dari master pasien.

alter table public.tindakan add column if not exists kelas_pembiayaan text;

comment on column public.tindakan.kelas_pembiayaan is
  'Jenis + kelas untuk laporan cara bayar (mis. NPBI - 1, Umum - 2). Kosong = fallback dari master pasien di UI.';
