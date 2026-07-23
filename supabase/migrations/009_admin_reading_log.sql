-- ============================================================================
-- Audit log of admin actions on members' readings (log / remove).
-- Stores name snapshots so entries stay readable even after deletions.
-- ============================================================================
create table public.admin_reading_log (
  id                uuid primary key default gen_random_uuid(),
  challenge_id      uuid not null references challenges (id) on delete cascade,
  actor_id          uuid references profiles (id) on delete set null,
  actor_name        text,
  member_name       text,
  reading_label     text,
  action            text not null, -- 'log' | 'remove'
  on_time           boolean,
  read_with_someone boolean,
  created_at        timestamptz not null default now()
);

create index idx_admin_log_challenge on public.admin_reading_log (challenge_id, created_at desc);

alter table public.admin_reading_log enable row level security;

-- Only challenge admins may read the log; writes happen via the SECURITY
-- DEFINER functions below.
create policy "admin_log_select" on public.admin_reading_log
  for select to authenticated
  using (public.can_admin_challenge(challenge_id));

grant select on public.admin_reading_log to authenticated;

-- --------------------------------------------------------------------------
-- Rewrite the admin actions to also write an audit entry.
-- --------------------------------------------------------------------------
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
  v_actor     text;
  v_member    text;
  v_label     text;
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

  select display_name into v_actor from profiles where id = auth.uid();
  select p.display_name into v_member
  from challenge_participants cp join profiles p on p.id = cp.user_id
  where cp.id = p_participant;
  select display_text into v_label from readings where id = p_reading;

  insert into admin_reading_log (
    challenge_id, actor_id, actor_name, member_name, reading_label,
    action, on_time, read_with_someone
  )
  values (
    v_challenge, auth.uid(), v_actor, v_member, v_label,
    'log', coalesce(p_on_time, true), coalesce(p_with_someone, false)
  );
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
  v_actor     text;
  v_member    text;
  v_label     text;
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

  select display_name into v_actor from profiles where id = auth.uid();
  select p.display_name into v_member
  from challenge_participants cp join profiles p on p.id = cp.user_id
  where cp.id = p_participant;
  select display_text into v_label from readings where id = p_reading;

  insert into admin_reading_log (
    challenge_id, actor_id, actor_name, member_name, reading_label, action
  )
  values (v_challenge, auth.uid(), v_actor, v_member, v_label, 'remove');
end;
$$;
