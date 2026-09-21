-- Per-challenge toggle for the weekly "perfect week" double.
-- When disabled, points are flat (no ×2 for completing all 7 days on time),
-- but streaks still track exactly as before — the challenge just becomes a
-- pure streak tracker with no weekly bonus.
alter table challenges
  add column if not exists weekly_bonus_enabled boolean not null default true;

-- Recompute weekly_points, doubling only when the challenge opts in.
-- Output columns are unchanged, so dependent views need no changes.
create or replace view weekly_scores
with (security_invoker = on) as
with per_week as (
  select
    cp.id                                                                   as participant_id,
    cp.challenge_id,
    cp.user_id,
    cp.team_id,
    c.weekly_bonus_enabled,
    (r.date - extract(dow from r.date)::int)                                as week_start,
    count(*) filter (where not rp.is_backfill)                             as on_time_count,
    count(*) filter (where rp.is_backfill)                                 as backfill_count,
    least(1, count(*) filter (where rp.read_with_someone and not rp.is_backfill)) as companion_bonus,
    (count(*) filter (where not rp.is_backfill) = 7)                       as perfect_week
  from reading_progress rp
  join readings r               on r.id = rp.reading_id
  join challenge_participants cp on cp.id = rp.participant_id
  join challenges c             on c.id = cp.challenge_id
  group by cp.id, cp.challenge_id, cp.user_id, cp.team_id, c.weekly_bonus_enabled, week_start
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
  ((on_time_count + companion_bonus)
    * (case when perfect_week and weekly_bonus_enabled then 2 else 1 end))
    + backfill_count as weekly_points
from per_week;
