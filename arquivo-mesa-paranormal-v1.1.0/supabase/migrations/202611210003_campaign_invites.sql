-- Arquivo v1.2.0: convites seguros e ingresso transacional em campanhas.
-- Não altera nem remove campanhas, participantes ou convites já existentes.

create or replace function public.create_campaign_invite(
  p_campaign_id uuid,
  p_expires_at timestamptz default null,
  p_max_uses integer default null
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'É necessário estar autenticado.';
  end if;
  if not public.is_campaign_gm(p_campaign_id) then
    raise exception 'Somente o mestre da campanha pode criar convites.';
  end if;
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'A validade do convite precisa estar no futuro.';
  end if;
  if p_max_uses is not null and p_max_uses < 1 then
    raise exception 'O limite de usos precisa ser maior que zero.';
  end if;

  new_code := upper(encode(gen_random_bytes(16), 'hex'));
  insert into public.campaign_invites
    (campaign_id, invite_code, created_by, role, expires_at, max_uses)
  values
    (p_campaign_id, new_code, auth.uid(), 'PLAYER', p_expires_at, p_max_uses);
  return new_code;
end;
$$;

create or replace function public.join_campaign_by_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.campaign_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta para usar um convite.';
  end if;
  if p_invite_code is null or length(trim(p_invite_code)) = 0 then
    raise exception 'Informe o código do convite.';
  end if;

  select * into invite_row
  from public.campaign_invites
  where invite_code = upper(trim(p_invite_code))
  for update;

  if not found then
    raise exception 'Código de convite inválido.';
  end if;
  if not invite_row.active then
    raise exception 'Este convite foi desativado.';
  end if;
  if invite_row.expires_at is not null and invite_row.expires_at <= now() then
    raise exception 'Este convite expirou.';
  end if;
  if invite_row.max_uses is not null and invite_row.uses >= invite_row.max_uses then
    raise exception 'Este convite atingiu o limite de usos.';
  end if;

  if exists (
    select 1 from public.campaign_members
    where campaign_id = invite_row.campaign_id and user_id = auth.uid()
  ) then
    return invite_row.campaign_id;
  end if;

  insert into public.campaign_members (campaign_id, user_id, role)
  values (invite_row.campaign_id, auth.uid(), 'PLAYER');

  update public.campaign_invites
  set uses = uses + 1
  where id = invite_row.id;

  return invite_row.campaign_id;
end;
$$;

revoke all on function public.create_campaign_invite(uuid, timestamptz, integer) from public;
revoke all on function public.join_campaign_by_invite(text) from public;
grant execute on function public.create_campaign_invite(uuid, timestamptz, integer) to authenticated;
grant execute on function public.join_campaign_by_invite(text) to authenticated;
