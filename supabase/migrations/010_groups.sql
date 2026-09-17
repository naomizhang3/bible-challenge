-- ============================================================================
-- Audience groups (e.g. Young People, College Students).
--   * Admin-managed list.
--   * Each user belongs to at most one group (profiles.group_id).
--   * Each challenge targets one group, or everyone when group_id is null.
--   * Challenge visibility is enforced by RLS: you see a challenge if it's for
--     everyone, for your group, you created it, or you're a global admin.
-- ============================================================================

create table public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create policy "groups_select" on public.groups
  for select to authenticated using (true);
create policy "groups_insert_admin" on public.groups
  for insert to authenticated with check (public.is_global_admin());
create policy "groups_update_admin" on public.groups
  for update to authenticated
  using (public.is_global_admin()) with check (public.is_global_admin());
create policy "groups_delete_admin" on public.groups
  for delete to authenticated using (public.is_global_admin());

grant select, insert, update, delete on public.groups to authenticated;

-- Membership + targeting columns.
alter table public.profiles
  add column group_id uuid references public.groups (id) on delete set null;
grant update (group_id) on public.profiles to authenticated;

alter table public.challenges
  add column group_id uuid references public.groups (id) on delete set null;
create index idx_challenges_group_id on public.challenges (group_id);

-- The current user's group (SECURITY DEFINER avoids RLS recursion in policies).
create or replace function public.current_group_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select group_id from public.profiles where id = auth.uid();
$$;

-- Restrict which challenges a user can see.
drop policy "challenges_select" on public.challenges;
create policy "challenges_select" on public.challenges
  for select to authenticated using (
    group_id is null
    or public.is_global_admin()
    or created_by = (select auth.uid())
    or group_id = public.current_group_id()
  );

-- Seed the two starting groups.
insert into public.groups (name, sort_order)
values ('Young People', 1), ('College Students', 2)
on conflict (name) do nothing;
