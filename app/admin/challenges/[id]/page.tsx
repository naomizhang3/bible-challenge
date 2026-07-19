import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "../../../../src/lib/admin";
import AppHeader from "../../../app-header";
import DeleteChallengeButton from "./delete-challenge-button";
import EditChallenge from "./edit-challenge";
import PlanEditor from "./plan-editor";
import TeamsManager from "./teams-manager";
import MembersManager from "./members-manager";

export default async function AdminChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, isAdmin } = await getViewer();

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, name, description, status, start_date, end_date, created_by")
    .eq("id", id)
    .single();

  if (!challenge) notFound();

  // Global admin OR the challenge owner may administer it.
  const canAdmin = isAdmin || challenge.created_by === user!.id;
  if (!canAdmin) redirect("/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const { data: readings } = await supabase
    .from("readings")
    .select("id, day_number, date, display_text")
    .eq("challenge_id", id)
    .order("day_number", { ascending: true });

  const { data: teams } = await supabase
    .from("teams")
    .select("id, name")
    .eq("challenge_id", id)
    .order("name", { ascending: true });

  const { data: participants } = await supabase
    .from("challenge_participants")
    .select("id, user_id, team_id, profiles(display_name)")
    .eq("challenge_id", id);

  // Member counts per team, derived from participants.
  const memberCounts = new Map<string, number>();
  for (const p of participants ?? []) {
    if (p.team_id)
      memberCounts.set(p.team_id, (memberCounts.get(p.team_id) ?? 0) + 1);
  }
  const teamsWithCounts = (teams ?? []).map((t) => ({
    ...t,
    memberCount: memberCounts.get(t.id) ?? 0,
  }));

  const members = (participants ?? []).map((p) => ({
    id: p.id,
    teamId: p.team_id,
    displayName:
      (p.profiles as { display_name: string } | null)?.display_name ??
      "(unknown)",
  }));

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        displayName={profile?.display_name}
        avatarUrl={profile?.avatar_url}
        isAdmin={isAdmin}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-5">
        <div>
          <Link href="/admin" className="text-sm text-muted hover:text-heading">
            ← Admin
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-bold text-heading">
            {challenge.name}
          </h1>
        </div>

        <Section title="Challenge">
        <EditChallenge challenge={challenge} />
      </Section>

        <Section title="Reading plan">
          <PlanEditor
            challengeId={id}
            defaultStartDate={challenge.start_date}
            summary={
              (readings ?? []).length > 0
                ? {
                    count: readings!.length,
                    first: readings![0].display_text,
                    last: readings![readings!.length - 1].display_text,
                    firstDate: readings![0].date,
                    lastDate: readings![readings!.length - 1].date,
                  }
                : null
            }
          />
        </Section>

      <Section title="Teams">
        <TeamsManager challengeId={id} teams={teamsWithCounts} />
      </Section>

        <Section title="Members">
          <MembersManager members={members} teams={teams ?? []} />
        </Section>

        <section className="rounded-2xl border border-red-300/60 bg-surface p-5 shadow-sm">
          <h2 className="mb-1 font-serif text-lg font-semibold text-red-600">
            Danger zone
          </h2>
          <p className="mb-3 text-sm text-muted">
            Permanently delete this challenge and all of its readings, teams,
            members, and progress.
          </p>
          <DeleteChallengeButton
            challengeId={id}
            challengeName={challenge.name}
          />
        </section>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-hair bg-surface p-5 shadow-sm">
      <h2 className="mb-3 font-serif text-lg font-semibold text-heading">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
