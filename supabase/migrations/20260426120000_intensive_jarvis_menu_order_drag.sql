-- Penegasan urutan menu JARVIS untuk fitur drag-and-drop.
-- Kolom order_index sudah didefinisikan di 20260425000000_intensive_jarvis_menu.sql;
-- migrasi ini menambah dokumentasi dan memastikan indeks sort tersedia.

comment on column public.intensive_jarvis_menu.order_index is
  'Posisi tampil (0, 1, 2, …). Diperbarui klien setelah drag; GET diurutkan order_index.';

-- Idempotent: indeks sort dari migrasi asli
create index if not exists intensive_jarvis_menu_order_idx
  on public.intensive_jarvis_menu (order_index);
