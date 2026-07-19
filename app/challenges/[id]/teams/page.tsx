import { createClient } from "../../../../src/lib/supabase/server";
import TeamMembershipButton from "./team-membership-button";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("id, team_id")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!participant) {
    return (
      <p className="text-muted">
        Join this challenge first to create or join a team.
      </p>
    );
  }

  const { data: teams } = await supabase
    .from("team_leaderboard")
    .select("team_id, team_name, member_count, avg_points_per_member")
    .eq("challenge_id", id)
    .order("team_name", { ascending: true });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Join a team below. Teams are created by challenge admins.
      </p>

      {teams?.map((t) => {
        const isCurrent = t.team_id === participant.team_id;
        return (
          <div
            key={t.team_id}
            className={
              "flex items-center justify-between gap-3 rounded-2xl border bg-surface p-4 shadow-sm " +
              (isCurrent
                ? "border-brand/30 ring-1 ring-brand/20"
                : "border-hair")
            }
          >
            <div className="min-w-0">
              <div className="font-serif text-lg font-semibold text-heading">
                {t.team_name}
                {isCurrent && (
                  <span className="ml-2 align-middle text-xs font-normal text-muted">
                    your team
                  </span>
                )}
              </div>
              <div className="text-xs text-muted">
                {t.member_count} member{t.member_count === 1 ? "" : "s"} ·{" "}
                {Number(t.avg_points_per_member ?? 0).toFixed(1)} avg pts
              </div>
            </div>
            <TeamMembershipButton
              participantId={participant.id}
              teamId={t.team_id as string}
              isCurrent={isCurrent}
            />
          </div>
        );
      })}
      {(!teams || teams.length === 0) && (
        <div className="rounded-2xl border border-hair bg-surface p-6 text-center text-sm text-muted shadow-sm">
          No teams yet — an admin can create the first one.
        </div>
      )}
    </div>
  );
}
