import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/server";

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

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!challenge) notFound();

  const { data: individuals } = await supabase
    .from("individual_leaderboard")
    .select("user_id, display_name, total_points, current_streak, rank")
    .eq("challenge_id", id)
    .order("rank", { ascending: true });

  const { data: teams } = await supabase
    .from("team_leaderboard")
    .select("team_id, team_name, member_count, avg_points_per_member, rank")
    .eq("challenge_id", id)
    .order("rank", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-8">
      <div>
        <Link
          href={`/challenges/${id}`}
          className="text-sm text-black/60 underline dark:text-white/60"
        >
          ← {challenge.name}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Leaderboard</h1>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          Individuals
        </h2>
        <ol className="space-y-1">
          {individuals?.map((row) => {
            const isMe = row.user_id === user!.id;
            return (
              <li
                key={row.user_id}
                className={
                  "flex items-center justify-between rounded-md px-3 py-2 text-sm " +
                  (isMe
                    ? "bg-foreground/10 font-medium"
                    : "border border-black/5 dark:border-white/10")
                }
              >
                <span className="flex items-center gap-3">
                  <span className="w-6 text-black/50 dark:text-white/50">
                    {row.rank}
                  </span>
                  <span>{row.display_name}</span>
                  {isMe && (
                    <span className="text-xs text-black/40 dark:text-white/40">
                      you
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-4">
                  <span className="text-black/50 dark:text-white/50">
                    🔥 {row.current_streak}
                  </span>
                  <span className="font-semibold">{row.total_points} pts</span>
                </span>
              </li>
            );
          })}
          {(!individuals || individuals.length === 0) && (
            <p className="text-sm text-black/60 dark:text-white/60">
              No participants yet.
            </p>
          )}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-black/60 dark:text-white/60">
          Teams · ranked by average points per member
        </h2>
        <ol className="space-y-1">
          {teams?.map((row) => (
            <li
              key={row.team_id}
              className="flex items-center justify-between rounded-md border border-black/5 px-3 py-2 text-sm dark:border-white/10"
            >
              <span className="flex items-center gap-3">
                <span className="w-6 text-black/50 dark:text-white/50">
                  {row.rank}
                </span>
                <span>{row.team_name}</span>
                <span className="text-xs text-black/40 dark:text-white/40">
                  {row.member_count} member
                  {row.member_count === 1 ? "" : "s"}
                </span>
              </span>
              <span className="font-semibold">
                {Number(row.avg_points_per_member ?? 0).toFixed(1)} avg
              </span>
            </li>
          ))}
          {(!teams || teams.length === 0) && (
            <p className="text-sm text-black/60 dark:text-white/60">
              No teams yet.
            </p>
          )}
        </ol>
      </section>
    </main>
  );
}
