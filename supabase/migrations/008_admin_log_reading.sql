-- ============================================================================
-- Admin logging: let a challenge admin record/remove a reading for a member
-- (e.g. someone read while offline). Bypasses the timezone/backfill window and
-- can mark the reading on-time so it counts toward the member's streak.
-- ============================================================================

-- Allow the timing trigger to be skipped for admin-driven inserts.
create or replace function public.set_reading_progress_timing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz           text;
  v_today        date;
  v_reading_date date;
begin
  -- Admin override (set by admin_set_reading_done) skips window enforcement.
  if current_setting('app.admin_bypass', true) = 'on' then
    return new;
  end if;

  select coalesce(p.timezone, 'UTC') into v_tz
  from challenge_participants cp
  join profiles p on p.id = cp.user_id
  where cp.id = new.participant_id;

  if v_tz is null then
    v_tz := 'UTC';
  end if;

  select date into v_reading_date from readings where id = new.reading_id;

  v_today := (now() at time zone v_tz)::date;

  if v_reading_date > v_today then
    raise exception 'You can''t complete a future reading yet.';
  end if;
  if v_reading_date < v_today - 7 then
    raise exception 'The backfill window for this reading has closed.';
  end if;

  new.is_backfill := (v_reading_date <> v_today);
  if new.is_backfill then
    new.read_with_someone := false;
  end if;

  return new;
end;
$$;

-- Record (or update) a member's reading. on_time = counts toward streak.
create or replace function public.admin_set_reading_done(
  p_participant  uuid,
  p_reading      uuid,
  p_with_someone boolean default false,
  p_on_time      boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge uuid;
begin
  select challenge_id into v_challenge
  from challenge_participants where id = p_participant;
  if v_challenge is null then
    raise exception 'Unknown participant.';
  end if;
  if not public.can_admin_challenge(v_challenge) then
    raise exception 'Not authorized to manage this challenge.';
  end if;
  if not exists (
    select 1 from readings where id = p_reading and challenge_id = v_challenge
  ) then
    raise exception 'That reading is not part of this challenge.';
  end if;

  perform set_config('app.admin_bypass', 'on', true);

  insert into reading_progress (participant_id, reading_id, read_with_someone, is_backfill)
  values (
    p_participant,
    p_reading,
    coalesce(p_with_someone, false),
    not coalesce(p_on_time, true)
  )
  on conflict (participant_id, reading_id) do update
    set read_with_someone = excluded.read_with_someone,
        is_backfill = excluded.is_backfill;
end;
$$;

create or replace function public.admin_remove_reading(
  p_participant uuid,
  p_reading     uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge uuid;
begin
  select challenge_id into v_challenge
  from challenge_participants where id = p_participant;
  if v_challenge is null then
    raise exception 'Unknown participant.';
  end if;
  if not public.can_admin_challenge(v_challenge) then
    raise exception 'Not authorized to manage this challenge.';
  end if;

  delete from reading_progress
  where participant_id = p_participant and reading_id = p_reading;
end;
$$;

grant execute on function public.admin_set_reading_done(uuid, uuid, boolean, boolean) to authenticated;
grant execute on function public.admin_remove_reading(uuid, uuid) to authenticated;
