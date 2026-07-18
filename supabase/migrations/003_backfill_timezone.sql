-- ============================================================================
-- Per-user timezones + backfill (catch-up) support
-- ----------------------------------------------------------------------------
--  * Each user has a timezone; "today" and the Sun–Sat week are computed in it.
--  * A reading can be completed on-time (its date == user's today) or backfilled
--    (an earlier day in the SAME week, until that Saturday 23:59 in the user tz).
--  * Backfill = flat +1 point: no companion bonus, never doubled, no streak.
-- ============================================================================

-- User timezone (IANA name); synced from the browser after login.
alter table profiles add column timezone text not null default 'UTC';
grant update (timezone) on profiles to authenticated;

-- Marks whether a completion was logged late (a catch-up) vs on its own day.
alter table reading_progress add column is_backfill boolean not null default false;

-- --------------------------------------------------------------------------
-- BEFORE INSERT trigger: validate the completion window and classify the row.
-- Uses the participant's timezone so the rule is enforced server-side.
-- --------------------------------------------------------------------------
create or replace function public.set_reading_progress_timing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz           text;
  v_today        date;
  v_week_start   date;
  v_reading_date date;
begin
  select coalesce(p.timezone, 'UTC') into v_tz
  from challenge_participants cp
  join profiles p on p.id = cp.user_id
  where cp.id = new.participant_id;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  select date into v_reading_date from readings where id = new.reading_id;

  v_today := (now() at time zone v_tz)::date;
  v_week_start := v_today - extract(dow from v_today)::int;  -- Sunday

  if v_reading_date > v_today then
    raise exception 'You can''t complete a future reading yet.';
  end if;
  if v_reading_date < v_week_start then
    raise exception 'The backfill window for this reading has closed.';
  end if;

  new.is_backfill := (v_reading_date <> v_today);
  if new.is_backfill then
    new.read_with_someone := false;  -- catch-up earns a flat +1 only
  end if;

  return new;
end;
$$;

create trigger trg_reading_progress_timing
  before insert on reading_progress
  for each row execute function public.set_reading_progress_timing();

-- ============================================================================
-- Rebuild scoring & streak views for backfill semantics.
-- Drop in dependency order, then recreate.
-- ============================================================================
drop view if exists team_leaderboard;
drop view if exists individual_leaderboard;
drop view if exists participant_weekly_streaks;
drop view if exists participant_daily_streaks;
drop view if exists weekly_scores;

-- Per participant, per Sun–Sat week.
--   on_time_count   = completions done on their own day
--   backfill_count  = catch-up completions (flat +1 each, never doubled)
--   companion_bonus = +1 max/week, on-time only
--   perfect_week    = all 7 days completed ON TIME
--   weekly_points   = (on_time + companion) * (perfect ? 2 : 1) + backfill
create view weekly_scores
with (security_invoker = on) as
with per_week as (
  select
    cp.id                                                                   as participant_id,
    cp.challenge_id,
    cp.user_id,
    cp.team_id,
    (r.date - extract(dow from r.date)::int)                                as week_start,
    count(*) filter (where not rp.is_backfill)                             as on_time_count,
    count(*) filter (where rp.is_backfill)                                 as backfill_count,
    least(1, count(*) filter (where rp.read_with_someone and not rp.is_backfill)) as companion_bonus,
    (count(*) filter (where not rp.is_backfill) = 7)                       as perfect_week
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
  on_time_count,
  backfill_count,
  companion_bonus,
  perfect_week,
  ((on_time_count + companion_bonus) * (case when perfect_week then 2 else 1 end))
    + backfill_count as weekly_points
from per_week;

-- Consecutive-day streaks — ON-TIME completions only (backfill never revives).
create view participant_daily_streaks
with (security_invoker = on) as
with days as (
  select rp.participant_id, r.date
  from reading_progress rp
  join readings r on r.id = rp.reading_id
  where not rp.is_backfill
),
grouped as (
  select
    participant_id,
    date,
    date - (row_number() over (partition by participant_id order by date))::int as grp
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
  max(i.len)                                                   as longest_streak,
  max(case when i.end_date = l.last_day then i.len else 0 end) as current_streak
from islands i
join latest l on l.participant_id = i.participant_id
group by i.participant_id;

-- Weekly streak: consecutive ON-TIME days within the participant's CURRENT
-- Sun–Sat week, computed in their own timezone.
create view participant_weekly_streaks
with (security_invoker = on) as
with base as (
  select
    cp.id as participant_id,
    ((now() at time zone coalesce(p.timezone, 'UTC'))::date
      - extract(dow from (now() at time zone coalesce(p.timezone, 'UTC'))::date)::int) as week_start
  from challenge_participants cp
  join profiles p on p.id = cp.user_id
),
days as (
  select rp.participant_id, r.date
  from reading_progress rp
  join readings r on r.id = rp.reading_id
  join base b on b.participant_id = rp.participant_id
  where not rp.is_backfill
    and r.date >= b.week_start
    and r.date <  b.week_start + 7
),
grouped as (
  select
    participant_id,
    date,
    date - (row_number() over (partition by participant_id order by date))::int as grp
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

-- Individual leaderboard (unchanged shape).
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

-- Team leaderboard (unchanged shape).
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

-- Re-grant SELECT on the recreated views (DROP removed prior grants).
grant select on
  weekly_scores,
  participant_daily_streaks,
  participant_weekly_streaks,
  individual_leaderboard,
  team_leaderboard
  to authenticated;
