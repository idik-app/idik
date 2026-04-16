-- Function to reverse (un-allocate) FIFO stock reduction based on a cathlab_pemakaian_order_id.
create or replace function public.reverse_pemakaian_order_allocations(
  p_order_id text
) returns void
language plpgsql
as $$
declare
  r record;
begin
  for r in
    select id, inventaris_id, jumlah
    from public.pemakaian
    where cathlab_pemakaian_order_id = p_order_id
  loop
    -- Add stock back to inventaris
    update public.inventaris
    set stok = stok + r.jumlah,
        updated_at = now()
    where id = r.inventaris_id;

    -- Delete the pemakaian record
    delete from public.pemakaian where id = r.id;
  end loop;
end;
$$;
