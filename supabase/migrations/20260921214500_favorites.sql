-- Favoritos de usuarios logados (docs/SSD.md 10.2). Contas sao opcionais: visitante
-- continua com favoritos so no aparelho, esta tabela existe apenas para quem entra.
create table public.favorites (
  -- on delete cascade: excluir a conta (RF-21) apaga os favoritos junto, sem rotina extra.
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('line', 'stop')),
  ref        text not null, -- codigo da linha ou id da parada
  created_at timestamptz not null default now(),
  -- A chave composta impede duplicata e ja serve de indice para "favoritos do usuario".
  primary key (user_id, kind, ref)
);

-- RLS ligada: sem politica, ninguem le nem escreve. FORCE aplica a regra tambem ao dono
-- da tabela, para que um erro de papel numa migration futura nao abra um atalho.
alter table public.favorites enable row level security;
alter table public.favorites force row level security;

-- O projeto remoto foi criado com "Automatically expose new tables" desligado, entao sem
-- GRANT a tabela nem aparece na Data API. Zera o que os default privileges do banco local
-- concedem e libera so o necessario: anon nada, authenticated so select/insert/delete.
-- Sem update de proposito: favorito se cria ou se apaga (T2, menor privilegio).
revoke all on table public.favorites from anon, authenticated;
grant select, insert, delete on table public.favorites to authenticated;

-- `(select auth.uid())` em subselect: o Postgres avalia uma vez por consulta em vez de
-- uma por linha. `to authenticated` deixa o anon fora mesmo se algum GRANT vazar.
create policy "favorites_select_own" on public.favorites
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- with check impede o usuario A de gravar linha com o user_id de B.
create policy "favorites_insert_own" on public.favorites
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "favorites_delete_own" on public.favorites
  for delete to authenticated
  using ((select auth.uid()) = user_id);
