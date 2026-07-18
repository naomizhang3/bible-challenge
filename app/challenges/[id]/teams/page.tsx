import Link from "next/link";
import { notFound } from "next/navigation";
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

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!challenge) notFound();

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("id, team_id")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!participant) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 p-8">
        <BackLink id={id} name={challenge.name} />
        <p className="text-black/60 dark:text-white/60">
          Join this challenge first to create or join a team.
        </p>
      </main>
    );
  }

  const { data: teams } = await supabase
    .from("team_leaderboard")
    .select("team_id, team_name, member_count, avg_points_per_member")
    .eq("challenge_id", id)
    .order("team_name", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div>
        <BackLink id={id} name={challenge.name} />
        <h1 className="mt-2 text-2xl font-semibold">Teams</h1>
      </div>

      <p className="text-sm text-black/60 dark:text-white/60">
        Join a team below. Teams are created by challenge admins.
      </p>

      <ul className="space-y-2">
        {teams?.map((t) => {
          const isCurrent = t.team_id === participant.team_id;
          return (
            <li
              key={t.team_id}
              className={
                "flex items-center justify-between rounded-lg border px-4 py-3 " +
                (isCurrent
                  ? "border-foreground/40 bg-foreground/5"
                  : "border-black/10 dark:border-white/15")
              }
            >
              <div>
                <div className="font-medium">
                  {t.team_name}
                  {isCurrent && (
                    <span className="ml-2 text-xs text-black/40 dark:text-white/40">
                      your team
                    </span>
                  )}
                </div>
                <div className="text-xs text-black/50 dark:text-white/50">
                  {t.member_count} member{t.member_count === 1 ? "" : "s"} ·{" "}
                  {Number(t.avg_points_per_member ?? 0).toFixed(1)} avg pts
                </div>
              </div>
              <TeamMembershipButton
                participantId={participant.id}
                teamId={t.team_id as string}
                isCurrent={isCurrent}
              />
            </li>
          );
        })}
        {(!teams || teams.length === 0) && (
          <p className="text-sm text-black/60 dark:text-white/60">
            No teams yet — create the first one.
          </p>
        )}
      </ul>
    </main>
  );
}

function BackLink({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/challenges/${id}`}
      className="text-sm text-black/60 underline dark:text-white/60"
    >
      ← {name}
    </Link>
  );
}
