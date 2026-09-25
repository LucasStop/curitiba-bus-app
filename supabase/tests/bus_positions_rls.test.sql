-- Posicoes de onibus: leitura publica, escrita so pelo servidor (docs/URBS-WEBSERVICE.md).
-- Roda com `supabase test db`; tudo em transacao com rollback.
begin;

create extension if not exists pgtap with schema extensions;

select plan(14);

select is(
  (select bool_and(relrowsecurity and relforcerowsecurity) from pg_class
    where oid in ('public.bus_positions'::regclass, 'public.bus_feed_status'::regclass)),
  true,
  'RLS ligada e forcada nas duas tabelas'
);

-- Rodada 1 (como postgres): dois onibus.
select is(
  public.ingest_bus_positions(
    '[{"prefix":"AA001","line_code":"203","lat":-25.4,"lon":-49.3,"refreshed_at":"2026-09-25T20:00:00Z","status":"on_time","route_state":"on_route","urbs_direction":"IDA","accessible":true},
      {"prefix":"BB002","line_code":"303","lat":-25.5,"lon":-49.2,"refreshed_at":"2026-09-25T20:00:00Z","status":"late","route_state":"on_route","urbs_direction":"VOLTA","accessible":false}]'::jsonb,
    '2026-09-25T20:01:00Z'),
  2,
  'rodada 1 grava 2 onibus'
);

-- Rodada 2 (12 min depois): AA001 andou; BB002 nao aparece e a ultima leitura dele tem 12 min.
select is(
  public.ingest_bus_positions(
    '[{"prefix":"AA001","line_code":"203","lat":-25.41,"lon":-49.31,"refreshed_at":"2026-09-25T20:11:00Z","status":"late","route_state":"on_route","urbs_direction":"IDA","accessible":true}]'::jsonb,
    '2026-09-25T20:12:00Z'),
  1,
  'rodada 2 grava 1 onibus'
);
select is(
  (select prev_lat from public.bus_positions where prefix = 'AA001'),
  -25.4::double precision,
  'posicao anterior guardada na rodada 2'
);
select is_empty(
  $$ select 1 from public.bus_positions where prefix = 'BB002' $$,
  'posicao com mais de 10 min e apagada'
);

-- Mesma leitura do REFRESH nao sobrescreve a posicao anterior.
select public.ingest_bus_positions(
  '[{"prefix":"AA001","line_code":"203","lat":-25.41,"lon":-49.31,"refreshed_at":"2026-09-25T20:11:00Z","status":"late","route_state":"on_route","urbs_direction":"IDA","accessible":true}]'::jsonb,
  '2026-09-25T20:13:00Z');
select is(
  (select prev_lat from public.bus_positions where prefix = 'AA001'),
  -25.4::double precision,
  'REFRESH repetido preserva a posicao anterior'
);
-- Retrato atrasado da URBS (REFRESH mais velho) nao sobrescreve a leitura nova.
select public.ingest_bus_positions(
  '[{"prefix":"AA001","line_code":"203","lat":-25.5,"lon":-49.5,"refreshed_at":"2026-09-25T20:05:00Z","status":"late","route_state":"on_route","urbs_direction":"IDA","accessible":true}]'::jsonb,
  '2026-09-25T20:14:00Z');
select is(
  (select lat from public.bus_positions where prefix = 'AA001'),
  -25.41::double precision,
  'leitura mais velha nao sobrescreve a mais nova'
);
select is(
  (select vehicle_count from public.bus_feed_status where id = 1),
  1,
  'vehicle_count atualizado'
);

select public.mark_bus_feed_attempt('http_503');
select is(
  (select last_error from public.bus_feed_status where id = 1),
  'http_503',
  'erro categorizado registrado'
);

-- anon: le, nao escreve, nao executa as funcoes de ingestao.
set local role anon;
select is((select count(*)::int from public.bus_positions), 1, 'anon le bus_positions');
select is((select count(*)::int from public.bus_feed_status), 1, 'anon le bus_feed_status');
select throws_ok(
  $$ insert into public.bus_positions (prefix, line_code, lat, lon, refreshed_at, fetched_at)
     values ('ZZ999', '203', 0, 0, now(), now()) $$,
  '42501',
  null,
  'anon nao insere em bus_positions'
);
select throws_ok(
  $$ update public.bus_feed_status set vehicle_count = 999 $$,
  '42501',
  null,
  'anon nao atualiza bus_feed_status'
);
select throws_ok(
  $$ select public.ingest_bus_positions('[]'::jsonb, now()) $$,
  '42501',
  null,
  'anon nao executa ingest_bus_positions'
);

select * from finish();
rollback;
