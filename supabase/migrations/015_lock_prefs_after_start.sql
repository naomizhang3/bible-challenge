-- Grouping preferences may only be set/changed BEFORE the challenge starts.
-- Editable while the participant's local date is before the challenge start_date.
create or replace function public.challenge_prefs_editable(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (now() at time zone coalesce(p.timezone, 'UTC'))::date < c.start_date
  from challenges c, profiles p
  where c.id = cid and p.id = auth.uid();
$$;

grant execute on function public.challenge_prefs_editable(uuid) to authenticated;

-- Re-create insert/update policies with the "before start" guard.
drop policy if exists "group_prefs_insert_own" on challenge_group_preferences;
create policy "group_prefs_insert_own" on challenge_group_preferences
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.challenge_prefs_editable(challenge_id)
  );

drop policy if exists "group_prefs_update_own" on challenge_group_preferences;
create policy "group_prefs_update_own" on challenge_group_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.challenge_prefs_editable(challenge_id)
  );
