-- Teams are now admin-controlled: members can no longer join/leave teams
-- themselves. The only self-service update on challenge_participants was the
-- team_id change from the teams page, so drop the self-update policy entirely.
-- Admins retain "participants_update_admin" to assign teams, and members keep
-- insert-own (join challenge) and delete-own (leave challenge).
drop policy if exists "participants_update_own" on challenge_participants;
