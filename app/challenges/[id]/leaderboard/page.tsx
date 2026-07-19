import { createClient } from "../../../../src/lib/supabase/server";
import { todayInTz, weekBoundsFromISO } from "../../../../src/lib/dates";
import LeaderboardTabs, { type Row, type TeamRow } from "./leaderboard-tabs";

// Competition ranking (1,2,2,4) over a points-sorted list.
function withRanks<T extends { points: number }>(items: T[]) {
  const sorted = [...items].sort((a, b) => b.points - a.points);
  let rank = 0;
  let prev: number | null = null;
  return sorted.map((it, i) => {
    if (prev === null || it.points !== prev) rank = i + 1;
    prev = it.points;
    return { ...it, rank };
  });
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();
  const tz = profile?.timezone ?? "UTC";
  const { start: weekStart } = weekBoundsFromISO(todayInTz(tz));

  const { data: ind } = await supabase
    .from("individual_leaderboard")
    .select("user_id, display_name, total_points, current_streak, rank, team_id")
    .eq("challenge_id", id)
    .order("rank", { ascending: true });

  const { data: wk } = await supabase
    .from("weekly_scores")
    .select("user_id, weekly_points")
    .eq("challenge_id", id)
    .eq("week_start", weekStart);

  const { data: teamRows } = await supabase
    .from("team_leaderboard")
    .select("team_id, team_name, member_count, avg_points_per_member, rank")
    .eq("challenge_id", id)
    .order("rank", { ascending: true });

  const weekPtsByUser = new Map(
    (wk ?? []).map((w) => [w.user_id, w.weekly_points ?? 0])
  );

  const individualsAll: Row[] = (ind ?? []).map((r) => ({
    userId: r.user_id ?? "",
    name: r.display_name ?? "—",
    points: r.total_points ?? 0,
    streak: r.current_streak ?? 0,
    rank: r.rank ?? 0,
  }));
  const individualsWeek: Row[] = withRanks(
    (ind ?? []).map((r) => ({
      userId: r.user_id ?? "",
      name: r.display_name ?? "—",
      points: Number(weekPtsByUser.get(r.user_id ?? "") ?? 0),
      streak: r.current_streak ?? 0,
    }))
  );

  const teamsAll: TeamRow[] = (teamRows ?? []).map((t) => ({
    teamId: t.team_id ?? "",
    name: t.team_name ?? "—",
    members: t.member_count ?? 0,
    avg: Number(t.avg_points_per_member ?? 0),
    rank: t.rank ?? 0,
  }));
  const teamsWeek: TeamRow[] = withRanks(
    (teamRows ?? []).map((t) => {
      const members = (ind ?? []).filter((r) => r.team_id === t.team_id);
      const total = members.reduce(
        (s, m) => s + Number(weekPtsByUser.get(m.user_id ?? "") ?? 0),
        0
      );
      return {
        teamId: t.team_id ?? "",
        name: t.team_name ?? "—",
        members: t.member_count ?? 0,
        points: members.length ? total / members.length : 0,
      };
    })
  ).map((t) => ({ ...t, avg: t.points }));

  return (
    <LeaderboardTabs
      meId={user!.id}
      individualsAll={individualsAll}
      individualsWeek={individualsWeek}
      teamsAll={teamsAll}
      teamsWeek={teamsWeek}
    />
  );
}
