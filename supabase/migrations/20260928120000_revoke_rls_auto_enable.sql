-- rls_auto_enable e a funcao do event trigger "ensure_rls" que o proprio Supabase cria ao ligar
-- o RLS automatico. Ela e security definer e ficava executavel por anon/authenticated via
-- /rest/v1/rpc (advisor 0028/0029). O event trigger continua disparando: o disparo nao checa
-- EXECUTE de quem roda o DDL. Guardado porque a funcao nao existe no banco local.
do $$
begin
  if exists (
    select 1 from pg_proc
    where proname = 'rls_auto_enable' and pronamespace = 'public'::regnamespace
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
