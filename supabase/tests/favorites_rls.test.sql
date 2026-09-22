-- Isolamento de favoritos entre usuarios (docs/TDD.md, casos R1 a R5).
-- Roda com `supabase test db` (banco local do Docker), tudo dentro de uma transacao
-- que termina em rollback: nenhum dado de teste persiste.
begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- Estrutura: sem estas garantias as politicas abaixo nao valem nada.
select has_table('public', 'favorites', 'favorites existe');
select is(
  (select relrowsecurity and relforcerowsecurity from pg_class where oid = 'public.favorites'::regclass),
  true,
  'RLS ligada e forcada em favorites'
);

-- Dois usuarios de teste e um favorito de cada (semeado como postgres).
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'a@example.test'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'b@example.test');

insert into public.favorites (user_id, kind, ref) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'line', '203'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'stop', 'p-42');

-- Simula o usuario A, como o PostgREST faz com o JWT.
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","role":"authenticated"}';

-- R1: A ve so os proprios favoritos, nunca os de B.
select results_eq(
  $$ select user_id, kind, ref from public.favorites $$,
  $$ values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'line'::text, '203'::text) $$,
  'R1: A le apenas os favoritos de A'
);
select is_empty(
  $$ select 1 from public.favorites where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' $$,
  'R1: A filtrando pelo id de B recebe 0 linhas'
);

-- Caminho feliz: A insere e apaga o proprio favorito.
select lives_ok(
  $$ insert into public.favorites (user_id, kind, ref) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'stop', 'p-1') $$,
  'A insere favorito proprio'
);
select lives_ok(
  $$ delete from public.favorites where ref = 'p-1' $$,
  'A apaga favorito proprio'
);

-- R2: A nao insere linha em nome de B (42501 = violacao de RLS).
select throws_ok(
  $$ insert into public.favorites (user_id, kind, ref) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'line', '999') $$,
  '42501',
  null,
  'R2: A nao insere com user_id de B'
);

-- R3: A nao apaga linha de B (0 afetadas, sem erro).
select is_empty(
  $$ delete from public.favorites where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' returning 1 $$,
  'R3: A apaga 0 linhas de B'
);

-- Favoritos sao criar/apagar: sem UPDATE nem para a propria linha.
select throws_ok(
  $$ update public.favorites set ref = '204' where ref = '203' $$,
  '42501',
  null,
  'sem update: nem o dono altera favorito'
);

-- R4: anonimo (sem login) nao seleciona, insere nem apaga. Sem GRANT ao anon,
-- a negacao vem antes da RLS (permission denied for table).
reset role;
set local role anon;
set local request.jwt.claims = '';

select throws_ok($$ select * from public.favorites $$, '42501', null, 'R4: anon nao seleciona');
select throws_ok(
  $$ insert into public.favorites (user_id, kind, ref) values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'line', '1') $$,
  '42501',
  null,
  'R4: anon nao insere'
);
select throws_ok($$ delete from public.favorites $$, '42501', null, 'R4: anon nao apaga');

-- Confere, como postgres, que R2/R3/R4 nao mexeram em nada.
reset role;
select is(
  (select count(*)::int from public.favorites where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'favorito de B intacto depois das tentativas de A e do anon'
);

-- R5: apagar o usuario A remove os favoritos de A (cascata) e preserva os de B.
delete from auth.users where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
select is(
  (select count(*)::int from public.favorites where user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  0,
  'R5: favoritos de A somem com o usuario'
);
select is(
  (select count(*)::int from public.favorites where user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
  1,
  'R5: favoritos de B permanecem'
);

select * from finish();
rollback;
