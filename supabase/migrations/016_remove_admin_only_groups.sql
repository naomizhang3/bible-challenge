-- Drop the admin-only group mechanism ("Serving Ones"). Only admins see all
-- challenges now; there is no selectable group that grants all-access.
drop trigger if exists trg_enforce_group_membership on public.profiles;
drop function if exists public.enforce_group_membership();

-- Remove any admin-only groups (profiles/challenges referencing them are set
-- to null by the existing on-delete-set-null foreign keys).
delete from public.groups where admin_only;

-- The admin_only column is left in place (deprecated, defaults false) so the
-- currently-deployed build that still selects it keeps working during rollout.
-- It is no longer read or written by the app.
