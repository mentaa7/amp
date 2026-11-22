-- v1.3.0: habilita eventos em tempo real para campanhas e participantes.
-- A migration é idempotente: não tenta adicionar novamente tabelas já publicadas.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaigns'
  ) then
    alter publication supabase_realtime add table public.campaigns;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'campaign_members'
  ) then
    alter publication supabase_realtime add table public.campaign_members;
  end if;
end
$$;
