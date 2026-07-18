-- ============================================================================
-- Dev seed — runs automatically on `supabase start` / `supabase db reset`.
-- Creates a challenge owner plus two active challenges with readings anchored
-- to the CURRENT date, so "today's reading" always has an entry while
-- developing. Not intended for production.
-- ============================================================================

-- Challenge owner (auth user). Password hash uses pgcrypto (extensions schema).
-- Only needed to satisfy `created_by`; not set up for interactive login.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'owner@example.com',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"display_name":"Challenge Owner"}'
)
on conflict (id) do nothing;

-- Make the seed owner a global admin (profile row created by the signup trigger).
update profiles set is_admin = true
where id = '11111111-1111-1111-1111-111111111111';

-- Two active challenges owned by the seed user.
insert into challenges (id, name, description, status, start_date, end_date, created_by)
values
  (
    '22222222-2222-2222-2222-222222222222',
    'New Testament in a Season',
    'Read through the Gospels and beyond, one chapter a day.',
    'active',
    current_date - 3, current_date + 60,
    '11111111-1111-1111-1111-111111111111'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Psalms Daily',
    'A psalm a day to keep you grounded.',
    'active',
    current_date - 1, current_date + 30,
    '11111111-1111-1111-1111-111111111111'
  )
on conflict (id) do nothing;

-- Readings for challenge 1 (John 1..N), dates spanning around today.
insert into readings (challenge_id, day_number, date, display_text)
select
  '22222222-2222-2222-2222-222222222222',
  (row_number() over (order by d))::int,
  d::date,
  'John ' || (row_number() over (order by d))
from generate_series(current_date - 3, current_date + 10, interval '1 day') as d
on conflict (challenge_id, date) do nothing;

-- Readings for challenge 2 (Psalm 1..N), dates spanning around today.
insert into readings (challenge_id, day_number, date, display_text)
select
  '33333333-3333-3333-3333-333333333333',
  (row_number() over (order by d))::int,
  d::date,
  'Psalm ' || (row_number() over (order by d))
from generate_series(current_date - 1, current_date + 10, interval '1 day') as d
on conflict (challenge_id, date) do nothing;
