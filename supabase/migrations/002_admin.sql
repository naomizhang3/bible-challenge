-- ============================================================================
-- Admin roles
-- ----------------------------------------------------------------------------
-- Two tiers:
--   * Global admin  — profiles.is_admin = true; may administer ANY challenge
--                     and is the only role that can create challenges.
--   * Challenge owner — challenges.created_by; may administer THAT challenge.
-- "Administer" = manage readings, teams, and members for a challenge.
-- ============================================================================

alter table profiles add column is_admin boolean not null default false;

-- --------------------------------------------------------------------------
-- Prevent privilege escalation: authenticated users may edit only their own
-- display_name / avatar_url, never is_admin. Promotion is done out-of-band
-- (service role / SQL). Replaces the table-wide UPDATE grant from 001.
-- --------------------------------------------------------------------------
revoke update on profiles from authenticated;
grant update (display_name, avatar_url) on profiles to authenticated;

-- --------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they bypass RLS and can't recurse
-- when referenced from policies on the same tables).
-- --------------------------------------------------------------------------
create or replace function public.is_global_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.can_admin_challenge(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_global_admin()
      or exists (
        select 1 from public.challenges c
        where c.id = cid and c.created_by = auth.uid()
      );
$$;

-- ============================================================================
-- Tighten RLS policies
-- ============================================================================

-- challenges: only global admins create; owner or global admin edits/deletes
drop policy "challenges_insert" on challenges;
create policy "challenges_insert" on challenges
  for insert to authenticated
  with check (created_by = (select auth.uid()) and public.is_global_admin());

drop policy "challenges_update_own" on challenges;
create policy "challenges_update" on challenges
  for update to authenticated
  using (public.can_admin_challenge(id))
  with check (public.can_admin_challenge(id));

drop policy "challenges_delete_own" on challenges;
create policy "challenges_delete" on challenges
  for delete to authenticated
  using (public.can_admin_challenge(id));

-- readings: managed by challenge admins (owner or global admin)
drop policy "readings_insert_owner" on readings;
create policy "readings_insert_admin" on readings
  for insert to authenticated
  with check (public.can_admin_challenge(challenge_id));

drop policy "readings_update_owner" on readings;
create policy "readings_update_admin" on readings
  for update to authenticated
  using (public.can_admin_challenge(challenge_id))
  with check (public.can_admin_challenge(challenge_id));

drop policy "readings_delete_owner" on readings;
create policy "readings_delete_admin" on readings
  for delete to authenticated
  using (public.can_admin_challenge(challenge_id));

-- teams: creation/edit/delete restricted to challenge admins (the lock-down).
-- Members still self-join by updating their own challenge_participants row.
drop policy "teams_insert" on teams;
create policy "teams_insert_admin" on teams
  for insert to authenticated
  with check (public.can_admin_challenge(challenge_id));

drop policy "teams_update_own" on teams;
create policy "teams_update_admin" on teams
  for update to authenticated
  using (public.can_admin_challenge(challenge_id))
  with check (public.can_admin_challenge(challenge_id));

drop policy "teams_delete_own" on teams;
create policy "teams_delete_admin" on teams
  for delete to authenticated
  using (public.can_admin_challenge(challenge_id));

-- challenge_participants: keep self-management, ADD admin management so admins
-- can assign members to teams and remove participants in their challenges.
create policy "participants_update_admin" on challenge_participants
  for update to authenticated
  using (public.can_admin_challenge(challenge_id))
  with check (public.can_admin_challenge(challenge_id));

create policy "participants_delete_admin" on challenge_participants
  for delete to authenticated
  using (public.can_admin_challenge(challenge_id));
