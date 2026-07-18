-- ============================================================================
-- Bible Reading Challenge — initial schema
-- ============================================================================
-- Design notes:
--   * Points and streaks are DERIVED via views (see bottom of file), from
--     reading_progress only. The weekly-companion cap and perfect-week
--     doubling stay correct by construction.
--   * Teams are scoped per-challenge.
--   * Views use security_invoker so the querying user's RLS applies.
-- ============================================================================

-- Challenge lifecycle states
create type challenge_status as enum ('draft', 'active', 'completed', 'archived');

-- ----------------------------------------------------------------------------
-- profiles: app-level user data, 1:1 with Supabase auth.users
-- ----------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- challenges: multiple can run simultaneously
-- ----------------------------------------------------------------------------
create table challenges (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  status      challenge_status not null default 'draft',
  start_date  date not null,
  end_date    date not null,
  created_by  uuid not null references profiles (id) on delete restrict,
  created_at  timestamptz not null default now(),
  constraint challenges_dates_ck check (end_date >= start_date)
);

-- ----------------------------------------------------------------------------
-- teams: scoped to a single challenge
-- ----------------------------------------------------------------------------
create table teams (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges (id) on delete cascade,
  name         text not null,
  created_by   uuid not null references profiles (id) on delete restrict,
  created_at   timestamptz not null default now(),
  unique (challenge_id, name)
);

-- ----------------------------------------------------------------------------
-- challenge_participants: a user joining a challenge, optionally on a team
-- ----------------------------------------------------------------------------
create table challenge_participants (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  team_id      uuid references teams (id) on delete set null,
  joined_at    timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- ----------------------------------------------------------------------------
-- readings: the daily reading plan for a challenge
-- ----------------------------------------------------------------------------
create table readings (
  id           uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references challenges (id) on delete cascade,
  day_number   integer not null,
  date         date not null,
  display_text text not null,   -- e.g. "Hebrews 1"
  created_at   timestamptz not null default now(),
  unique (challenge_id, day_number),
  unique (challenge_id, date)
);

-- ----------------------------------------------------------------------------
-- reading_progress: single source of truth for scoring
-- ----------------------------------------------------------------------------
create table reading_progress (
  id                uuid primary key default gen_random_uuid(),
  participant_id    uuid not null references challenge_participants (id) on delete cascade,
  reading_id        uuid not null references readings (id) on delete restrict,
  read_with_someone boolean not null default false,
  completed_at      timestamptz not null default now(),
  unique (participant_id, reading_id)
);

-- ----------------------------------------------------------------------------
-- Indexes (foreign keys used in joins / leaderboard aggregation)
-- ----------------------------------------------------------------------------
create index idx_challenges_created_by      on challenges (created_by);
create index idx_teams_challenge_id         on teams (challenge_id);
create index idx_participants_challenge_id  on challenge_participants (challenge_id);
create index idx_participants_user_id       on challenge_participants (user_id);
create index idx_participants_team_id       on challenge_participants (team_id);
create index idx_readings_challenge_id      on readings (challenge_id);
create index idx_progress_participant_id    on reading_progress (participant_id);
create index idx_progress_reading_id        on reading_progress (reading_id);

-- ============================================================================
-- Auto-provision a profile row when a new auth user is created
-- ============================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================================
-- Derived scoring & leaderboard views
-- ============================================================================

-- Per participant, per week (Sunday–Saturday) scoring.
--   base_points     = readings completed that week (each completion = 1 distinct day)
--   companion_bonus = +1 max per week when read_with_someone
--   perfect_week    = completed a reading on all 7 days (Sun–Sat)
--   weekly_points   = (base + companion) doubled on a perfect week
-- Week key: reading date shifted back to the preceding Sunday
-- (Postgres dow: Sunday = 0).
create view weekly_scores
with (security_invoker = on) as
with per_week as (
  select
    cp.id                                                   as participant_id,
    cp.challenge_id,
    cp.user_id,
    cp.team_id,
    (r.date - extract(dow from r.date)::int)                as week_start,
    count(*)                                                as base_points,
    least(1, count(*) filter (where rp.read_with_someone))  as companion_bonus,
    (count(*) = 7)                                          as perfect_week
  from reading_progress rp
  join readings r               on r.id = rp.reading_id
  join challenge_participants cp on cp.id = rp.participant_id
  group by cp.id, cp.challenge_id, cp.user_id, cp.team_id, week_start
)
select
  participant_id,
  challenge_id,
  user_id,
  team_id,
  week_start,
  base_points,
  companion_bonus,
  perfect_week,
  (base_points + companion_bonus) * (case when perfect_week then 2 else 1 end) as weekly_points
from per_week;

-- Consecutive-day streaks per participant (gaps-and-islands).
--   current_streak = run of consecutive days ending on their latest completion
--   longest_streak = longest run ever
create view participant_daily_streaks
with (security_invoker = on) as
with days as (
  select rp.participant_id, r.date
  from reading_progress rp
  join readings r on r.id = rp.reading_id
),
grouped as (
  select
    participant_id,
    date,
    date
      - (row_number() over (partition by participant_id order by date))::int as grp
  from days
),
islands as (
  select participant_id, grp, count(*) as len, max(date) as end_date
  from grouped
  group by participant_id, grp
),
latest as (
  select participant_id, max(end_date) as last_day
  from islands
  group by participant_id
)
select
  i.participant_id,
  max(i.len)                                                    as longest_streak,
  max(case when i.end_date = l.last_day then i.len else 0 end)  as current_streak
from islands i
join latest l on l.participant_id = i.participant_id
group by i.participant_id;

-- Weekly streak: consecutive completed reading days within the CURRENT
-- Sunday–Saturday week, counted up to the participant's most recent
-- completion in that week.
create view participant_weekly_streaks
with (security_invoker = on) as
with bounds as (
  select (current_date - extract(dow from current_date)::int) as week_start
),
days as (
  select rp.participant_id, r.date
  from reading_progress rp
  join readings r on r.id = rp.reading_id
  cross join bounds b
  where r.date >= b.week_start
    and r.date <  b.week_start + 7
),
grouped as (
  select
    participant_id,
    date,
    date
      - (row_number() over (partition by participant_id order by date))::int as grp
  from days
),
islands as (
  select participant_id, grp, count(*) as len, max(date) as end_date
  from grouped
  group by participant_id, grp
),
latest as (
  select participant_id, max(end_date) as last_day
  from islands
  group by participant_id
)
select
  i.participant_id,
  max(case when i.end_date = l.last_day then i.len else 0 end) as weekly_streak
from islands i
join latest l on l.participant_id = i.participant_id
group by i.participant_id;

-- Individual leaderboard: total points + streaks, ranked within each challenge.
create view individual_leaderboard
with (security_invoker = on) as
select
  cp.challenge_id,
  cp.user_id,
  p.display_name,
  cp.team_id,
  coalesce(sum(ws.weekly_points), 0)      as total_points,
  coalesce(max(ds.current_streak), 0)     as current_streak,
  coalesce(max(ds.longest_streak), 0)     as longest_streak,
  coalesce(max(wk.weekly_streak), 0)      as weekly_streak,
  rank() over (
    partition by cp.challenge_id
    order by coalesce(sum(ws.weekly_points), 0) desc
  )                                       as rank
from challenge_participants cp
join profiles p                        on p.id = cp.user_id
left join weekly_scores ws             on ws.participant_id = cp.id
left join participant_daily_streaks ds  on ds.participant_id = cp.id
left join participant_weekly_streaks wk on wk.participant_id = cp.id
group by cp.challenge_id, cp.user_id, p.display_name, cp.team_id;

-- Team leaderboard: average points per member, ranked within each challenge.
create view team_leaderboard
with (security_invoker = on) as
select
  t.challenge_id,
  t.id                                       as team_id,
  t.name                                     as team_name,
  count(il.user_id)                          as member_count,
  coalesce(avg(il.total_points), 0)          as avg_points_per_member,
  rank() over (
    partition by t.challenge_id
    order by coalesce(avg(il.total_points), 0) desc
  )                                          as rank
from teams t
left join individual_leaderboard il on il.team_id = t.id
group by t.challenge_id, t.id, t.name;

-- ============================================================================
-- Grants
-- ----------------------------------------------------------------------------
-- PostgREST enforces table-level privileges BEFORE row-level security, so the
-- roles that reach the DB through the API must be granted base privileges here;
-- RLS policies below then restrict which rows they can touch. The app is
-- login-gated, so only `authenticated` is granted (leaderboards require sign-in).
-- To make any resource public, additionally grant SELECT on it to `anon`.
-- ============================================================================
grant usage on schema public to authenticated;

grant select, insert, update, delete on
  profiles,
  challenges,
  teams,
  challenge_participants,
  readings,
  reading_progress
  to authenticated;

grant select on
  weekly_scores,
  participant_daily_streaks,
  participant_weekly_streaks,
  individual_leaderboard,
  team_leaderboard
  to authenticated;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table profiles               enable row level security;
alter table challenges             enable row level security;
alter table teams                  enable row level security;
alter table challenge_participants enable row level security;
alter table readings               enable row level security;
alter table reading_progress       enable row level security;

-- profiles: everyone (authenticated) can read; you may only write your own row
create policy "profiles_select" on profiles
  for select to authenticated using (true);
create policy "profiles_insert_own" on profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy "profiles_update_own" on profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- challenges: readable by all; only the creator can create/edit/delete
create policy "challenges_select" on challenges
  for select to authenticated using (true);
create policy "challenges_insert" on challenges
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "challenges_update_own" on challenges
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "challenges_delete_own" on challenges
  for delete to authenticated using (created_by = (select auth.uid()));

-- teams: readable by all; only the creator can create/edit/delete
create policy "teams_select" on teams
  for select to authenticated using (true);
create policy "teams_insert" on teams
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy "teams_update_own" on teams
  for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy "teams_delete_own" on teams
  for delete to authenticated using (created_by = (select auth.uid()));

-- challenge_participants: readable by all (leaderboards); you manage your own row
create policy "participants_select" on challenge_participants
  for select to authenticated using (true);
create policy "participants_insert_own" on challenge_participants
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "participants_update_own" on challenge_participants
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "participants_delete_own" on challenge_participants
  for delete to authenticated using (user_id = (select auth.uid()));

-- readings: readable by all; only the challenge creator can manage the plan
create policy "readings_select" on readings
  for select to authenticated using (true);
create policy "readings_insert_owner" on readings
  for insert to authenticated with check (
    exists (select 1 from challenges c where c.id = readings.challenge_id and c.created_by = (select auth.uid()))
  );
create policy "readings_update_owner" on readings
  for update to authenticated using (
    exists (select 1 from challenges c where c.id = readings.challenge_id and c.created_by = (select auth.uid()))
  );
create policy "readings_delete_owner" on readings
  for delete to authenticated using (
    exists (select 1 from challenges c where c.id = readings.challenge_id and c.created_by = (select auth.uid()))
  );

-- reading_progress: readable by all (leaderboards); you may only log your own
create policy "progress_select" on reading_progress
  for select to authenticated using (true);
create policy "progress_insert_own" on reading_progress
  for insert to authenticated with check (
    exists (
      select 1 from challenge_participants cp
      where cp.id = reading_progress.participant_id and cp.user_id = (select auth.uid())
    )
  );
create policy "progress_update_own" on reading_progress
  for update to authenticated using (
    exists (
      select 1 from challenge_participants cp
      where cp.id = reading_progress.participant_id and cp.user_id = (select auth.uid())
    )
  );
create policy "progress_delete_own" on reading_progress
  for delete to authenticated using (
    exists (
      select 1 from challenge_participants cp
      where cp.id = reading_progress.participant_id and cp.user_id = (select auth.uid())
    )
  );
