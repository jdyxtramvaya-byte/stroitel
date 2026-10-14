-- Secure personal accounts for Строитель (Supabase)
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'user' check (role in ('user', 'owner')),
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Новый проект',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_updated_idx
  on public.projects (owner_id, updated_at desc);

create table if not exists public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  label text not null default '',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz
);

create index if not exists invite_codes_created_idx
  on public.invite_codes (created_at desc);

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.invite_codes enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select to authenticated using (
    owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active')
  );

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active')
  );

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update to authenticated
  using (
    owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active')
  )
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active')
  );

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete to authenticated using (
    owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active')
  );

-- No client-side access to invite records, even for authenticated users.
revoke all on public.invite_codes from anon, authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.projects to authenticated;

-- A profile is created automatically for every Auth user. Role is never taken from user metadata.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role, status)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''), 'user', 'active')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Called only by the registration Edge Function using the service role.
create or replace function public.consume_invite(p_token_hash text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.invite_codes
  set redeemed_at = now(), redeemed_by = p_user_id
  where token_hash = p_token_hash
    and redeemed_at is null
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  get diagnostics affected = row_count;
  return affected = 1;
end;
$$;

revoke all on function public.consume_invite(text, uuid) from public, anon, authenticated;
grant execute on function public.consume_invite(text, uuid) to service_role;

-- Owner is bootstrapped manually after the first owner account exists:
-- update public.profiles set role = 'owner' where id = '<AUTH_USER_UUID>';
