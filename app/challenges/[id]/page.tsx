import { createClient } from "../../../src/lib/supabase/server";
import { addDaysISO, todayInTz, weekBoundsFromISO } from "../../../src/lib/dates";
import JoinButton from "../join-button";
import MarkComplete from "./mark-complete";
import BackfillButton from "./backfill-button";
import LeaveChallengeButton from "./leave-challenge-button";

export default async function ChallengeTodayPage({
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
  // Rolling 7-day backfill window (a missed reading can be made up for a week).
  const backfillStart = addDaysISO(today, -7);

  const { data: participant } = await supabase
    .from("challenge_participants")
    .select("id")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!participant) {
    return (
      <div className="rounded-2xl border border-hair bg-surface p-6 shadow-sm">
        <p className="text-muted">
          Join this challenge to see today&apos;s reading.
        </p>
        <div className="mt-3">
          <JoinButton challengeId={id} />
        </div>
      </div>
    );
  }

  // Fetch readings spanning both the rolling backfill window and the rest of
  // the current week (for today's reading + the weekly companion-bonus check).
  const { data: rangeReadings } = await supabase
    .from("readings")
    .select("id, day_number, date, display_text")
    .eq("challenge_id", id)
    .gte("date", backfillStart)
    .lte("date", weekEnd)
    .order("date", { ascending: true });

  const dateByReading = new Map(
    (rangeReadings ?? []).map((r) => [r.id, r.date])
  );
  const ids = (rangeReadings ?? []).map((r) => r.id);
  const { data: progress } = ids.length
    ? await supabase
        .from("reading_progress")
        .select("id, reading_id, is_backfill, read_with_someone")
        .eq("participant_id", participant.id)
        .in("reading_id", ids)
    : { data: [] };

  const progressByReading = new Map(
    (progress ?? []).map((p) => [p.reading_id, p])
  );
  // Companion bonus is once per calendar week — only count on-time-week reads.
  const companionUsedThisWeek = (progress ?? []).some((p) => {
    const d = dateByReading.get(p.reading_id);
    return p.read_with_someone && d && d >= weekStart && d <= weekEnd;
  });

  const todayReading =
    (rangeReadings ?? []).find((r) => r.date === today) ?? null;
  const todayProgress = todayReading
    ? progressByReading.get(todayReading.id) ?? null
    : null;
  // Catch-up: readings in the last 7 days (excluding today) that were missed.
  const missedDays = (rangeReadings ?? []).filter(
    (r) => r.date < today && !progressByReading.has(r.id)
  );

  const { data: li } = await supabase
    .from("individual_leaderboard")
    .select("total_points, current_streak, weekly_streak, rank")
    .eq("challenge_id", id)
    .eq("user_id", user!.id)
    .maybeSingle();
  const { data: ws } = await supabase
    .from("weekly_scores")
    .select("weekly_points")
    .eq("participant_id", participant.id)
    .eq("week_start", weekStart)
    .maybeSingle();
  const { count: daysRead } = await supabase
    .from("reading_progress")
    .select("*", { count: "exact", head: true })
    .eq("participant_id", participant.id);

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-hair bg-surface shadow-sm">
        <div className="h-1.5 bg-amber-400" />
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Today&apos;s reading
              </p>
              {todayReading ? (
                <>
                  <h2 className="mt-1 font-serif text-3xl font-bold text-heading">
                    {todayReading.display_text}
                  </h2>
                  <p className="text-sm text-muted">
                    Day {todayReading.day_number} of the reading plan
                  </p>
                </>
              ) : (
                <p className="mt-2 text-muted">
                  No reading scheduled for today.
                </p>
              )}
            </div>
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-heading">
              <BookOpen />
            </span>
          </div>

          {todayReading && (
            <div className="mt-5">
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
          )}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          icon={<Trophy />}
          tint="text-heading"
          value={li?.total_points ?? 0}
          label="Total Points"
        />
        <Stat
          icon={<Star />}
          tint="text-amber-500"
          value={ws?.weekly_points ?? 0}
          label="Points This Week"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat
          icon={<Flame />}
          tint="text-red-500"
          value={li?.current_streak ?? 0}
          label="Total Streak"
        />
        <Stat
          icon={<Calendar />}
          tint="text-amber-500"
          value={li?.weekly_streak ?? 0}
          label="Week Streak"
        />
        <Stat
          icon={<BookOpen />}
          tint="text-emerald-600"
          value={daysRead ?? 0}
          label="Days Read"
        />
      </div>

      {missedDays.length > 0 && (
        <section className="rounded-2xl border border-hair bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-muted">Catch up</h2>
          <p className="mb-3 text-xs text-muted">
            You have one week to back-fill a missed reading. Catch-up counts as
            +1 and doesn&apos;t affect your streak.
          </p>
          <ul className="divide-y divide-hair">
            {missedDays.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between py-2 text-sm"
              >
                <span>
                  <span className="text-muted">{r.date}</span> — {r.display_text}
                </span>
                <BackfillButton
                  participantId={participant.id}
                  readingId={r.id}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="pt-1">
        <LeaveChallengeButton participantId={participant.id} />
      </div>
    </>
  );
}

function Stat({
  icon,
  tint,
  value,
  label,
}: {
  icon: React.ReactNode;
  tint: string;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-hair bg-surface p-4 shadow-sm">
      <span className={tint}>{icon}</span>
      <div className="mt-2 font-serif text-2xl font-bold text-heading">
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function BookOpen() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 6.5A6 6 0 0 0 6 4c-1 0-2 .2-3 .5v13A6 6 0 0 1 6 17c2.2 0 4 .8 6 2m0-12.5A6 6 0 0 1 18 4c1 0 2 .2 3 .5v13A6 6 0 0 0 18 17a6 6 0 0 0-6 2m0-12.5V19" />
    </svg>
  );
}
function Trophy() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}
function Star() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z" />
    </svg>
  );
}
function Flame() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2c.5 3-1.5 4.5-3 6.5C7 11 6 13 6 15a6 6 0 0 0 12 0c0-1.7-.7-3.4-2-5 .2 1.3-.4 2.4-1.3 2.8.6-2.2-.3-4.9-2.7-6.3.6 1.9-.2 3.3-1 4-.3-2.6.9-5.6 1-8.5z" />
    </svg>
  );
}
function Calendar() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v3M16 3v3" />
    </svg>
  );
}
