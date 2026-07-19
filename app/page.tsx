import Link from "next/link";
import { createClient } from "../src/lib/supabase/server";
import AppHeader from "./app-header";
import InstallPrompt from "./install-prompt";

function greeting(tz: string) {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      hour12: false,
    }).format(new Date())
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function longDate(tz: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone, is_admin")
    .eq("id", user!.id)
    .single();

  const tz = profile?.timezone ?? "UTC";
  const firstName = (profile?.display_name ?? "there").split(" ")[0];

  // Active challenges the user has joined, with their standing.
  const { data: parts } = await supabase
    .from("challenge_participants")
    .select("challenge_id")
    .eq("user_id", user!.id);
  const partChallengeIds = (parts ?? []).map((p) => p.challenge_id);

  const { data: challenges } = partChallengeIds.length
    ? await supabase
        .from("challenges")
        .select("id, name, description")
        .in("id", partChallengeIds)
        .eq("status", "active")
        .order("start_date", { ascending: true })
    : { data: [] };
  const activeIds = (challenges ?? []).map((c) => c.id);

  const { data: stats } = activeIds.length
    ? await supabase
        .from("individual_leaderboard")
        .select("challenge_id, total_points, current_streak, rank")
        .eq("user_id", user!.id)
        .in("challenge_id", activeIds)
    : { data: [] };
  const statByChallenge = new Map((stats ?? []).map((s) => [s.challenge_id, s]));

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        displayName={profile?.display_name}
        isAdmin={profile?.is_admin}
      />

      <main className="mx-auto w-full max-w-xl flex-1 space-y-6 p-5">
        <div className="pt-1">
          <h1 className="font-serif text-3xl font-bold leading-tight text-heading">
            {greeting(tz)}, {firstName}
          </h1>
          <p className="mt-1 text-muted">{longDate(tz)}</p>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Your challenges
          </h2>
          <Link
            href="/challenges"
            className="text-sm font-medium text-heading hover:underline"
          >
            Browse all →
          </Link>
        </div>

        {(challenges ?? []).length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {challenges!.map((c) => {
              const st = statByChallenge.get(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/challenges/${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-hair bg-surface p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-lg font-semibold text-heading">
                      {c.name}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-3 text-sm text-muted">
                      <span>
                        <span className="font-semibold text-heading">
                          {st?.total_points ?? 0}
                        </span>{" "}
                        pts
                      </span>
                      <span className="flex items-center gap-1">
                        <Flame />
                        {st?.current_streak ?? 0}
                      </span>
                      {st?.rank != null && <span>Rank #{st.rank}</span>}
                    </p>
                  </div>
                  <Chevron />
                </Link>
              );
            })}
          </div>
        )}

        <div className="flex justify-center pt-2">
          <InstallPrompt />
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-hair bg-surface p-8 text-center shadow-sm">
      <h2 className="font-serif text-xl font-bold text-heading">
        Begin your reading journey
      </h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
        You haven&apos;t joined a challenge yet. Find one to start reading and
        earning points with your community.
      </p>
      <Link
        href="/challenges"
        className="mt-5 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white"
      >
        Browse challenges
      </Link>
    </div>
  );
}

function Flame() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-amber-500"
      aria-hidden
    >
      <path d="M12 2c.5 3-1.5 4.5-3 6.5C7 11 6 13 6 15a6 6 0 0 0 12 0c0-1.7-.7-3.4-2-5 .2 1.3-.4 2.4-1.3 2.8.6-2.2-.3-4.9-2.7-6.3.6 1.9-.2 3.3-1 4-.3-2.6.9-5.6 1-8.5z" />
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-slate-300"
      aria-hidden
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
