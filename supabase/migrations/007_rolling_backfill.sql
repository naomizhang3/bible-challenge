-- ============================================================================
-- Backfill window: a rolling 7 days per reading (not "until Saturday").
-- A reading may be completed on its own day (on-time) or backfilled up to
-- 7 days after its date, in the participant's timezone. This means a missed
-- Saturday reading can still be made up the following days.
-- ============================================================================
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
    new.read_with_someone := false;  -- catch-up earns a flat +1 only
  end if;

  return new;
end;
$$;
