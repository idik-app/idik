-- Anotasi koronar: taut ke tindakan (kunjungan) + id template gambar
-- tindakan_id sebagai text (tanpa FK): id di proyek bisa uuid atau bigint (remote).

alter table public.cathlab_koronar_annotation
  add column if not exists tindakan_id text;

alter table public.cathlab_koronar_annotation
  add column if not exists template_id text not null default 'standard-v1';

create index if not exists idx_cathlab_koronar_tindakan_id
  on public.cathlab_koronar_annotation (tindakan_id);

comment on column public.cathlab_koronar_annotation.tindakan_id is
  'Referensi ke public.tindakan.id (string: uuid atau bigint).';
comment on column public.cathlab_koronar_annotation.template_id is
  'Template pohon koroner (mis. standard-v1).';
