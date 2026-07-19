import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../../src/lib/supabase/server";
import AppHeader from "../../../app-header";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, is_admin")
    .eq("id", user!.id)
    .single();

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, name")
    .eq("id", id)
    .single();
  if (!challenge) notFound();

  const header = (
    <AppHeader
      displayName={profile?.display_name}
      avatarUrl={profile?.avatar_url}
      isAdmin={profile?.is_admin}
    />
  );

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("id, team_id")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!participant) {
    return (
      <div className="flex flex-1 flex-col">
        {header}
        <main className="mx-auto w-full max-w-xl flex-1 space-y-4 p-5">
          <Back id={id} name={challenge.name} />
          <p className="text-muted">
            Join this challenge first to create or join a team.
          </p>
        </main>
      </div>
    );
  }

  const { data: teams } = await supabase
    .from("team_leaderboard")
    .select("team_id, team_name, member_count, avg_points_per_member")
    .eq("challenge_id", id)
    .order("team_name", { ascending: true });

  return (
    <div className="flex flex-1 flex-col">
      {header}
      <main className="mx-auto w-full max-w-xl flex-1 space-y-5 p-5">
        <div>
          <Back id={id} name={challenge.name} />
          <h1 className="mt-2 font-serif text-3xl font-bold text-heading">
            Teams
          </h1>
          <p className="text-sm text-muted">
            Join a team below. Teams are created by challenge admins.
          </p>
        </div>

        <div className="space-y-3">
          {teams?.map((t) => {
            const isCurrent = t.team_id === participant.team_id;
            return (
              <div
                key={t.team_id}
                className={
                  "flex items-center justify-between gap-3 rounded-2xl border bg-surface p-4 shadow-sm " +
                  (isCurrent ? "border-brand/30 ring-1 ring-brand/20" : "border-hair")
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
      </main>
    </div>
  );
}

function Back({ id, name }: { id: string; name: string }) {
  return (
    <Link
      href={`/challenges/${id}`}
      className="text-sm text-muted hover:text-heading"
    >
      ← {name}
    </Link>
  );
}
