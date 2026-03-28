-- Selisih = Perolehan BPJS (total) − Total KRS (krs); dihitung otomatis di DB

create or replace function public.tindakan_set_selisih_dari_total_krs()
returns trigger as $$
declare
  t numeric;
  k numeric;
  k_raw text;
begin
  t := coalesce(new.total, 0);
  k_raw := trim(coalesce(new.krs::text, ''));
  if k_raw = '' then
    k := 0;
  else
    begin
      k := k_raw::numeric;
    exception
      when others then
        k := 0;
    end;
  end if;
  new.selisih := t - k;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_tindakan_selisih_total_krs on public.tindakan;
create trigger trg_tindakan_selisih_total_krs
  before insert or update of total, krs on public.tindakan
  for each row
  execute procedure public.tindakan_set_selisih_dari_total_krs();

comment on column public.tindakan.selisih is
  'Otomatis: Perolehan BPJS (total) − Total KRS (nilai numerik krs).';

-- Backfill: picu perhitungan ulang (SET menyentuh total & krs)
update public.tindakan
set total = total, krs = krs;
