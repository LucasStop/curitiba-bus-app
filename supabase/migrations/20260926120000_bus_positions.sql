-- Posicoes dos onibus vindas do WebService da URBS (docs/URBS-WEBSERVICE.md). Quem escreve e
-- so a Edge Function urbs-vehicles (service_role) via ingest_bus_positions, disparada pelo
-- pg_cron a cada 2 min. O app so le. Nenhum segredo entra nesta migration: URL do projeto e
-- segredo do cron ficam no Vault (project_url, urbs_cron_secret).
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

create table public.bus_positions (
  prefix            text primary key,               -- COD (ex.: JB612)
  line_code         text not null,                  -- CODIGOLINHA
  lat               double precision not null,
  lon               double precision not null,
  prev_lat          double precision,               -- posicao anterior (sentido e rumo)
  prev_lon          double precision,
  refreshed_at      timestamptz not null,           -- REFRESH (HH:MM:SS de Sao Paulo) como instante
  prev_refreshed_at timestamptz,
  status            text,                           -- SITUACAO: on_time | late | early | nonconforming
  route_state       text,                           -- SITUACAO2: on_route | off_route | other
  urbs_direction    text,                           -- SENT cru (IDA | VOLTA | CIRCULAR); nao e o ida/volta do app
  accessible        boolean not null default false, -- ADAPT = '1'
  vehicle_type      text,                           -- TIPO_VEIC
  schedule_table    text,                           -- TABELA
  fetched_at        timestamptz not null            -- rodada do feed que gravou a linha
);
create index bus_positions_line_code_idx on public.bus_positions (line_code);

-- Singleton (id = 1): saude do feed. last_attempt_at alimenta o throttle da funcao.
create table public.bus_feed_status (
  id              smallint primary key default 1 check (id = 1),
  fetched_at      timestamptz,           -- ultima ingestao com sucesso
  last_attempt_at timestamptz,           -- ultima tentativa
  last_error_at   timestamptz,
  last_error      text,                  -- so a categoria (http_503, timeout, parse), nunca URL
  vehicle_count   integer not null default 0
);
insert into public.bus_feed_status (id) values (1);

alter table public.bus_positions enable row level security;
alter table public.bus_positions force row level security;
alter table public.bus_feed_status enable row level security;
alter table public.bus_feed_status force row level security;

-- "Automatically expose new tables" esta desligado no remoto: GRANT explicito. Sem policy de
-- escrita; anon le porque o mapa funciona para visitante.
revoke all on table public.bus_positions, public.bus_feed_status from anon, authenticated;
grant select on table public.bus_positions, public.bus_feed_status to anon, authenticated;

create policy "bus_positions_select_all" on public.bus_positions
  for select to anon, authenticated using (true);
create policy "bus_feed_status_select_all" on public.bus_feed_status
  for select to anon, authenticated using (true);

-- Upsert da rodada: guarda a posicao anterior (so quando o ponto realmente avancou), remove
-- quem saiu do feed e marca a rodada como concluida.
create function public.ingest_bus_positions(rows jsonb, run_at timestamptz)
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
    fetched_at        = excluded.fetched_at;

  delete from public.bus_positions where fetched_at < run_at;

  select count(*) into total from public.bus_positions;

  update public.bus_feed_status
     set fetched_at = run_at, vehicle_count = total, last_error = null, last_error_at = null
   where id = 1;

  return total;
end;
$$;

create function public.mark_bus_feed_attempt(err text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.bus_feed_status
     set last_attempt_at = now(),
         last_error_at = case when err is null then last_error_at else now() end,
         last_error = case when err is null then last_error else err end
   where id = 1;
end;
$$;

revoke execute on function public.ingest_bus_positions(jsonb, timestamptz) from public, anon, authenticated;
revoke execute on function public.mark_bus_feed_attempt(text) from public, anon, authenticated;
grant execute on function public.ingest_bus_positions(jsonb, timestamptz) to service_role;
grant execute on function public.mark_bus_feed_attempt(text) to service_role;

-- Sem os segredos no Vault a URL fica nula e o http_post falha sem chamar ninguem.
select cron.schedule(
  'urbs-vehicles-every-2-min',
  '*/2 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/urbs-vehicles',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'urbs_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  );
  $$
);
