import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";
import { todayInTz, weekBoundsFromISO } from "../../../src/lib/dates";
import JoinButton from "../join-button";
import MarkComplete from "./mark-complete";
import BackfillButton from "./backfill-button";

export default async function ChallengeDetailPage({
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
  const today = todayInTz(tz);
  const { start: weekStart, end: weekEnd } = weekBoundsFromISO(today);

  const { data: challenge } = await supabase
    .from("challenges")
    .select("id, name, description, start_date, end_date")
    .eq("id", id)
    .single();

  if (!challenge) notFound();

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  // Not joined yet — prompt to join.
  if (!participant) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
        <BackLink />
        <h1 className="text-2xl font-semibold">{challenge.name}</h1>
        <p className="text-black/60 dark:text-white/60">
          Join this challenge to see today&apos;s reading.
        </p>
        <div>
          <JoinButton challengeId={challenge.id} />
        </div>
      </main>
    );
  }

  // This week's readings + the participant's progress on them.
  const { data: weekReadings } = await supabase
    .from("readings")
    .select("id, day_number, date, display_text")
    .eq("challenge_id", id)
    .gte("date", weekStart)
    .lte("date", weekEnd)
    .order("date", { ascending: true });

  const ids = (weekReadings ?? []).map((r) => r.id);
  const { data: weekProgress } = ids.length
    ? await supabase
        .from("reading_progress")
        .select("id, reading_id, is_backfill, read_with_someone")
        .eq("participant_id", participant.id)
        .in("reading_id", ids)
    : { data: [] };

  const progressByReading = new Map(
    (weekProgress ?? []).map((p) => [p.reading_id, p])
  );
  const companionUsedThisWeek = (weekProgress ?? []).some(
    (p) => p.read_with_someone
  );

  const todayReading = (weekReadings ?? []).find((r) => r.date === today) ?? null;
  const todayProgress = todayReading
    ? progressByReading.get(todayReading.id) ?? null
    : null;

  // Past days this week (for the catch-up section).
  const pastDays = (weekReadings ?? []).filter((r) => r.date < today);

  const { data: stats } = await supabase
    .from("individual_leaderboard")
    .select("total_points, current_streak, weekly_streak, rank")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <BackLink />

      <div>
        <h1 className="text-2xl font-semibold">{challenge.name}</h1>
        {challenge.description && (
          <p className="mt-1 text-sm text-black/60 dark:text-white/60">
            {challenge.description}
          </p>
        )}
        <div className="mt-3 flex gap-4 text-sm">
          <Link
            href={`/challenges/${id}/leaderboard`}
            className="underline text-black/70 dark:text-white/70"
          >
            Leaderboard
          </Link>
          <Link
            href={`/challenges/${id}/teams`}
            className="underline text-black/70 dark:text-white/70"
          >
            Teams
          </Link>
          <Link
            href={`/challenges/${id}/calendar`}
            className="underline text-black/70 dark:text-white/70"
          >
            Calendar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 text-center">
        <Stat label="Points" value={stats?.total_points ?? 0} />
        <Stat label="Streak" value={stats?.current_streak ?? 0} />
        <Stat label="This week" value={stats?.weekly_streak ?? 0} />
        <Stat label="Rank" value={stats?.rank ?? "—"} />
      </div>

      <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="text-sm font-medium text-black/60 dark:text-white/60">
          Today&apos;s reading · {today}
        </h2>
        {todayReading ? (
          <>
            <p className="mt-1 text-xl font-semibold">
              {todayReading.display_text}
            </p>
            <p className="text-xs text-black/50 dark:text-white/50">
              Day {todayReading.day_number}
            </p>
            <div className="mt-4">
              <MarkComplete
                participantId={participant.id}
                readingId={todayReading.id}
                initialProgress={
                  todayProgress
                    ? {
                        id: todayProgress.id,
                        read_with_someone: todayProgress.read_with_someone,
                      }
                    : null
                }
                companionUsedThisWeek={companionUsedThisWeek}
              />
            </div>
          </>
        ) : (
          <p className="mt-2 text-black/60 dark:text-white/60">
            No reading scheduled for today.
          </p>
        )}
      </section>

      {pastDays.length > 0 && (
        <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
          <h2 className="text-sm font-medium text-black/60 dark:text-white/60">
            Catch up this week
          </h2>
          <p className="mb-3 text-xs text-black/50 dark:text-white/50">
            Backfill a missed day until Saturday 11:59pm. Catch-up counts as +1
            and doesn&apos;t affect your streak.
          </p>
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {pastDays.map((r) => {
              const p = progressByReading.get(r.id);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>
                    <span className="text-black/50 dark:text-white/50">
                      {r.date}
                    </span>{" "}
                    — {r.display_text}
                  </span>
                  {p ? (
                    <span className="text-xs text-green-700 dark:text-green-400">
                      {p.is_backfill ? "✓ backfilled" : "✓ done"}
                    </span>
                  ) : (
                    <BackfillButton
                      participantId={participant.id}
                      readingId={r.id}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}

function BackLink() {
  return (
    <Link
      href="/challenges"
      className="text-sm text-black/60 underline dark:text-white/60"
    >
      ← All challenges
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-black/10 p-3 dark:border-white/15">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-black/50 dark:text-white/50">{label}</div>
    </div>
  );
}
