-- ============================================================================
-- Admin action: delete a challenge and everything under it.
-- reading_progress.reading_id is ON DELETE RESTRICT (to protect logged progress
-- from accidental single-reading deletes), so a plain challenge delete can fail.
-- This SECURITY DEFINER function removes progress first, then the challenge
-- (which cascades participants, readings, and teams), after an admin check.
-- ============================================================================
create or replace function public.delete_challenge(cid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_admin_challenge(cid) then
    raise exception 'Not authorized to delete this challenge.';
  end if;

  delete from reading_progress rp
  using readings r
  where r.id = rp.reading_id and r.challenge_id = cid;

  delete from challenges where id = cid;
end;
$$;

grant execute on function public.delete_challenge(uuid) to authenticated;
