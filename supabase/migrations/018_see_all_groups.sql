-- Re-introduce "Serving Ones": a group ANYONE can select whose members can see
-- every challenge (both Young People and College Students, plus everyone-open).
-- Unlike the old admin_only group, there is no join restriction — it's purely a
-- visibility flag, so a non-admin can pick it to see all challenges.

-- Drop the deprecated admin_only flag (no longer referenced by any code).
alter table public.groups drop column if exists admin_only;

-- Visibility flag: members of a see_all group see all challenges.
alter table public.groups
  add column if not exists see_all boolean not null default false;

insert into public.groups (name, sort_order, see_all)
values ('Serving Ones', 3, true)
on conflict (name) do update set see_all = excluded.see_all;

-- Helper: does the current user's group see all challenges?
-- SECURITY DEFINER avoids RLS recursion when used inside the policy.
create or replace function public.current_group_sees_all()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select g.see_all
     from public.profiles p
     join public.groups g on g.id = p.group_id
     where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.current_group_sees_all() to authenticated;

-- Extend challenge visibility to include see_all group members.
drop policy if exists "challenges_select" on public.challenges;
create policy "challenges_select" on public.challenges
  for select to authenticated using (
    group_id is null
    or public.is_global_admin()
    or created_by = (select auth.uid())
    or group_id = public.current_group_id()
    or public.current_group_sees_all()
  );
