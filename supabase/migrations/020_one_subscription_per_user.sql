-- A user can end up with multiple push subscriptions (e.g. Safari + the
-- home-screen PWA on the same phone), which causes duplicate notifications.
-- Collapse to one subscription per user (keep the newest), then enforce it.
delete from push_subscriptions a
using push_subscriptions b
where a.user_id = b.user_id
  and (a.created_at, a.id) < (b.created_at, b.id);

alter table push_subscriptions
  add constraint push_subscriptions_user_id_key unique (user_id);
