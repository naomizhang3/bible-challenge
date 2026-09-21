-- Remove the grouping-preferences feature entirely (no longer wanted).
-- Apply only after the build that stops referencing these objects is live.
drop table if exists public.challenge_group_preferences;
drop function if exists public.challenge_prefs_editable(uuid);
alter table public.challenges drop column if exists collect_group_preferences;
