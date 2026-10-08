-- Web Push subscriptions. Each browser/device that opts in stores its push
-- endpoint + keys here, tied to the user.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subs_user on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

-- Users manage only their own subscriptions.
create policy "push_subs_select_own" on push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "push_subs_insert_own" on push_subscriptions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push_subs_update_own" on push_subscriptions
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "push_subs_delete_own" on push_subscriptions
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on push_subscriptions to authenticated;

-- Admins send broadcasts, which means reading OTHER participants' subscriptions.
-- SECURITY DEFINER lets an admin fetch the subscriptions of everyone in a
-- challenge they administer, without a service-role key and without opening up
-- the table's RLS.
create or replace function public.push_subscriptions_for_challenge(cid uuid)
returns table (endpoint text, p256dh text, auth text)
language sql
stable
security definer
set search_path = public
as $$
  select ps.endpoint, ps.p256dh, ps.auth
  from push_subscriptions ps
  join challenge_participants cp on cp.user_id = ps.user_id
  where cp.challenge_id = cid
    and public.can_admin_challenge(cid);
$$;

grant execute on function public.push_subscriptions_for_challenge(uuid) to authenticated;

-- Remove a dead subscription by endpoint (used by the sender to prune 404/410s).
-- SECURITY DEFINER so the admin sender can delete stale rows it discovers.
create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from push_subscriptions where endpoint = p_endpoint;
$$;

grant execute on function public.delete_push_subscription(text) to authenticated;
