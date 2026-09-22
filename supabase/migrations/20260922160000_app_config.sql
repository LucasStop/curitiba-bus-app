-- Contrato de versao minima do app (gate de atualizacao forcada). Singleton: uma linha so,
-- lida no boot antes de qualquer autenticacao (visitante inclusive, D6). Sem policy de
-- insert/update/delete: o valor so muda pelo dashboard/service_role, nunca pelo app.
create table public.app_config (
  id           smallint primary key default 1,
  min_version  text not null,
  ios_url      text,
  android_url  text,
  updated_at   timestamptz not null default now(),
  constraint app_config_singleton check (id = 1)
);

alter table public.app_config enable row level security;
alter table public.app_config force row level security;

-- "Automatically expose new tables" esta desligado no projeto remoto: sem GRANT a tabela
-- nem aparece na Data API. anon precisa ler porque o gate roda antes do login.
revoke all on table public.app_config from anon, authenticated;
grant select on table public.app_config to anon, authenticated;

create policy "app_config_select_all" on public.app_config
  for select to anon, authenticated
  using (true);

insert into public.app_config (id, min_version) values (1, '1.0.0');
