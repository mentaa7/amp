-- Arquivo v0.9.0: base inicial do banco remoto (Supabase/Postgres)
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_members (
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('GM','PLAYER')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  sheet jsonb not null default '{}'::jsonb,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  invite_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'PLAYER' check (role in ('PLAYER','GM')),
  expires_at timestamptz,
  max_uses integer,
  uses integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.is_campaign_member(target_campaign uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.campaign_members m where m.campaign_id = target_campaign and m.user_id = auth.uid()); $$;

create or replace function public.is_campaign_gm(target_campaign uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.campaign_members m where m.campaign_id = target_campaign and m.user_id = auth.uid() and m.role = 'GM'); $$;

alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.campaign_members enable row level security;
alter table public.characters enable row level security;
alter table public.campaign_invites enable row level security;

create policy "profile read own" on public.profiles for select using (id = auth.uid());
create policy "profile insert own" on public.profiles for insert with check (id = auth.uid());
create policy "profile update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "campaign members can read" on public.campaigns for select using (public.is_campaign_member(id));
create policy "authenticated can create campaign" on public.campaigns for insert to authenticated with check (created_by = auth.uid());
create policy "GM can update campaign" on public.campaigns for update using (public.is_campaign_gm(id)) with check (public.is_campaign_gm(id));
create policy "GM can delete campaign" on public.campaigns for delete using (public.is_campaign_gm(id));

create policy "members can view roster" on public.campaign_members for select using (public.is_campaign_member(campaign_id));
create policy "creator can add self as GM" on public.campaign_members for insert to authenticated with check (user_id = auth.uid() and role = 'GM' and exists(select 1 from public.campaigns c where c.id = campaign_id and c.created_by = auth.uid()));
create policy "GM manages roster" on public.campaign_members for delete using (public.is_campaign_gm(campaign_id));
create policy "GM updates roster" on public.campaign_members for update using (public.is_campaign_gm(campaign_id)) with check (public.is_campaign_gm(campaign_id));

create policy "character owner or campaign member reads" on public.characters for select using (owner_id = auth.uid() or (campaign_id is not null and public.is_campaign_member(campaign_id)));
create policy "character owner creates" on public.characters for insert to authenticated with check (owner_id = auth.uid() and (campaign_id is null or public.is_campaign_member(campaign_id)));
create policy "owner or GM updates character" on public.characters for update using (owner_id = auth.uid() or (campaign_id is not null and public.is_campaign_gm(campaign_id))) with check (owner_id = auth.uid() or (campaign_id is not null and public.is_campaign_gm(campaign_id)));
create policy "owner or GM deletes character" on public.characters for delete using (owner_id = auth.uid() or (campaign_id is not null and public.is_campaign_gm(campaign_id)));

create policy "GM reads invites" on public.campaign_invites for select using (public.is_campaign_gm(campaign_id));
create policy "GM creates invites" on public.campaign_invites for insert to authenticated with check (created_by = auth.uid() and public.is_campaign_gm(campaign_id));
create policy "GM updates invites" on public.campaign_invites for update using (public.is_campaign_gm(campaign_id)) with check (public.is_campaign_gm(campaign_id));
create policy "GM deletes invites" on public.campaign_invites for delete using (public.is_campaign_gm(campaign_id));

create index if not exists campaign_members_user_idx on public.campaign_members(user_id);
create index if not exists characters_campaign_idx on public.characters(campaign_id);
create index if not exists characters_owner_idx on public.characters(owner_id);
create index if not exists invites_campaign_idx on public.campaign_invites(campaign_id);
