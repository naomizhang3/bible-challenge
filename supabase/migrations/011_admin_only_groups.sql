-- ============================================================================
-- Restricted groups: some groups (e.g. "Serving Ones") can only be joined by
-- admins. Enforced by a trigger so it can't be bypassed via the API.
-- ============================================================================

alter table public.groups
  add column admin_only boolean not null default false;

-- Seed the admin-only "Serving Ones" group.
insert into public.groups (name, sort_order, admin_only)
values ('Serving Ones', 3, true)
on conflict (name) do update set admin_only = excluded.admin_only;

-- Reject setting a profile's group to an admin-only group unless that profile
-- is an admin.
create or replace function public.enforce_group_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.group_id is not null
     and not coalesce(new.is_admin, false)
     and exists (
       select 1 from public.groups g
       where g.id = new.group_id and g.admin_only
     )
  then
    raise exception 'That group is restricted to admins.';
  end if;
  return new;
end;
$$;

create trigger trg_enforce_group_membership
  before insert or update on public.profiles
  for each row execute function public.enforce_group_membership();
