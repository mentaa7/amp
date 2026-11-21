-- Arquivo v1.1.0: campanhas remotas com criação atômica e diário compartilhado.
-- Seguro para reexecução: adiciona a coluna e substitui a função pelo nome.
alter table public.campaigns
  add column if not exists notes text not null default '';

create or replace function public.create_campaign_with_owner(
  campaign_name text,
  campaign_description text default ''
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_campaign_id uuid;
begin
  if auth.uid() is null then
    raise exception 'É necessário estar autenticado para criar uma campanha.';
  end if;

  if campaign_name is null or length(trim(campaign_name)) = 0 then
    raise exception 'Informe o nome da campanha.';
  end if;

  insert into public.campaigns (name, description, created_by)
  values (trim(campaign_name), coalesce(trim(campaign_description), ''), auth.uid())
  returning id into new_campaign_id;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (new_campaign_id, auth.uid(), 'GM');

  return new_campaign_id;
end;
$$;

revoke all on function public.create_campaign_with_owner(text, text) from public;
grant execute on function public.create_campaign_with_owner(text, text) to authenticated;
