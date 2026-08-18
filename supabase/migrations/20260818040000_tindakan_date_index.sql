-- Migration: 20260818040000_tindakan_date_index.sql
-- Description: Indeks komposit B-Tree pada tabel tindakan untuk mempercepat query rentang tanggal (mis. periode 2020-2026)

CREATE INDEX IF NOT EXISTS idx_tindakan_tanggal_id 
  ON public.tindakan (tanggal DESC NULLS LAST, id DESC);

CREATE INDEX IF NOT EXISTS idx_tindakan_ruangan_tanggal 
  ON public.tindakan (ruangan, tanggal DESC NULLS LAST);
