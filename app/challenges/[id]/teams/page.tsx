import { createClient } from "../../../../src/lib/supabase/server";

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

  // Member names, grouped by team, to show a roster under each team.
  const { data: members } = await supabase
    .from("challenge_participants")
    .select("user_id, team_id, profiles(display_name)")
    .eq("challenge_id", id)
    .not("team_id", "is", null);

  const membersByTeam = new Map<string, { name: string; isMe: boolean }[]>();
  for (const m of members ?? []) {
    if (!m.team_id) continue;
    const profileRel = m.profiles as { display_name: string | null } | null;
    const list = membersByTeam.get(m.team_id) ?? [];
    list.push({
      name: profileRel?.display_name ?? "—",
      isMe: m.user_id === user!.id,
    });
    membersByTeam.set(m.team_id, list);
  }
  for (const list of membersByTeam.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Teams are managed by challenge admins. Reach out to an admin to be added
        or moved.
      </p>

      {teams?.map((t) => {
        const isCurrent = t.team_id === participant.team_id;
        return (
          <div
            key={t.team_id}
            className={
              "flex items-center justify-between gap-3 rounded-2xl border p-4 shadow-sm " +
              (isCurrent
                ? "border-hair bg-amber-500/10"
                : "border-hair bg-surface")
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
              {(() => {
                const roster = membersByTeam.get(t.team_id as string) ?? [];
                if (roster.length === 0) return null;
                return (
                  <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
                    {roster.map((m, idx) => (
                      <span key={idx} className={m.isMe ? "text-heading" : ""}>
                        {m.name}
                        {m.isMe && " (you)"}
                        {idx < roster.length - 1 && ","}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </div>
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
