-- Menu JARVIS per ruangan: item tidak bercampur antar unit.

alter table public.intensive_jarvis_menu
  add column if not exists ruangan_id uuid references public.ruangan (id) on delete cascade;

update public.intensive_jarvis_menu
set ruangan_id = coalesce(
  (select id from public.ruangan where slug = 'idik' limit 1),
  (select id from public.ruangan order by slug limit 1)
)
where ruangan_id is null;

-- Salin menu dari idik ke ruangan lain yang belum punya baris (sekali per unit).
insert into public.intensive_jarvis_menu (
  label,
  icon_name,
  action_type,
  action_value,
  order_index,
  is_active,
  ruangan_id
)
select
  m.label,
  m.icon_name,
  m.action_type,
  m.action_value,
  m.order_index,
  m.is_active,
  r.id
from public.ruangan r
inner join public.intensive_jarvis_menu m
  on m.ruangan_id = (select id from public.ruangan where slug = 'idik' limit 1)
where
  r.slug <> 'idik'
  and not exists (
    select 1
    from public.intensive_jarvis_menu x
    where x.ruangan_id = r.id
  );

alter table public.intensive_jarvis_menu
  alter column ruangan_id set not null;

drop index if exists public.intensive_jarvis_menu_order_idx;

create index if not exists intensive_jarvis_menu_ruangan_order_idx
  on public.intensive_jarvis_menu (ruangan_id, order_index);

comment on column public.intensive_jarvis_menu.ruangan_id is
  'Unit/ruangan; GET/CRUD API memfilter menurut ini agar menu tidak tertukar antar ruangan.';

drop policy if exists "Allow public read on jarvis menu" on public.intensive_jarvis_menu;
drop policy if exists "Allow auth users to manage jarvis menu" on public.intensive_jarvis_menu;
drop policy if exists "jarvis_menu_access_by_unit" on public.intensive_jarvis_menu;

create policy "jarvis_menu_access_by_unit"
  on public.intensive_jarvis_menu
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.user_unit_access u
      where
        u.user_id = auth.uid()
        and u.ruangan_id = intensive_jarvis_menu.ruangan_id
    )
  )
  with check (
    exists (
      select 1
      from public.user_unit_access u
      where
        u.user_id = auth.uid()
        and u.ruangan_id = intensive_jarvis_menu.ruangan_id
    )
  );
