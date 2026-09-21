-- Per-challenge "who would you like to be grouped with?" survey.
-- Opt-in per challenge; participants type free-text names, admins read them
-- to help form teams.
alter table challenges
  add column if not exists collect_group_preferences boolean not null default false;

create table if not exists challenge_group_preferences (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges (id) on delete cascade,
  user_id       uuid not null references profiles (id) on delete cascade,
  names         text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index if not exists idx_group_prefs_challenge
  on challenge_group_preferences (challenge_id);

alter table challenge_group_preferences enable row level security;

-- Each participant manages their own row; challenge admins can read all rows.
create policy "group_prefs_select" on challenge_group_preferences
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.can_admin_challenge(challenge_id)
  );
create policy "group_prefs_insert_own" on challenge_group_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "group_prefs_update_own" on challenge_group_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "group_prefs_delete_own" on challenge_group_preferences
  for delete to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete
  on challenge_group_preferences to authenticated;
