-- A URBS as vezes devolve um retrato atrasado (poucos veiculos com REFRESH recente). Apagar
-- "quem sumiu da rodada" fazia o mapa oscilar entre ~1000 e ~70 onibus. Agora a posicao vale
-- por 10 min desde o proprio REFRESH do veiculo, e uma leitura mais velha nunca sobrescreve
-- uma mais nova.
create or replace function public.ingest_bus_positions(rows jsonb, run_at timestamptz)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
begin
  insert into public.bus_positions as bp (
    prefix, line_code, lat, lon, refreshed_at, status, route_state,
    urbs_direction, accessible, vehicle_type, schedule_table, fetched_at
  )
  select r.prefix, r.line_code, r.lat, r.lon, r.refreshed_at, r.status, r.route_state,
         r.urbs_direction, coalesce(r.accessible, false), r.vehicle_type, r.schedule_table, run_at
  from jsonb_to_recordset(rows) as r(
    prefix text, line_code text, lat double precision, lon double precision,
    refreshed_at timestamptz, status text, route_state text, urbs_direction text,
    accessible boolean, vehicle_type text, schedule_table text
  )
  on conflict (prefix) do update set
    prev_lat          = case when excluded.refreshed_at > bp.refreshed_at then bp.lat else bp.prev_lat end,
    prev_lon          = case when excluded.refreshed_at > bp.refreshed_at then bp.lon else bp.prev_lon end,
    prev_refreshed_at = case when excluded.refreshed_at > bp.refreshed_at then bp.refreshed_at else bp.prev_refreshed_at end,
    line_code         = excluded.line_code,
    lat               = excluded.lat,
    lon               = excluded.lon,
    refreshed_at      = excluded.refreshed_at,
    status            = excluded.status,
    route_state       = excluded.route_state,
    urbs_direction    = excluded.urbs_direction,
    accessible        = excluded.accessible,
    vehicle_type      = excluded.vehicle_type,
    schedule_table    = excluded.schedule_table,
    fetched_at        = excluded.fetched_at
  where excluded.refreshed_at >= bp.refreshed_at;

  delete from public.bus_positions where refreshed_at < run_at - interval '10 minutes';

  select count(*) into total from public.bus_positions;

  update public.bus_feed_status
     set fetched_at = run_at, vehicle_count = total, last_error = null, last_error_at = null
   where id = 1;

  return total;
end;
$$;
