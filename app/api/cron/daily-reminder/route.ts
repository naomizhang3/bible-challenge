import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "../../../../src/lib/supabase/admin";
import { todayInTz } from "../../../../src/lib/dates";
import {
  ensurePushConfigured,
  sendPush,
  type PushSub,
} from "../../../../src/lib/push-server";

export const runtime = "nodejs";

// Reminder titles. "It's time to read!" is listed more often so it shows up the
// majority of the time, with the others mixed in to keep it fresh.
const TITLES = [
  "It's time to read!",
  "It's time to read!",
  "It's time to read!",
  "It's time to read!",
  "It's time to read!",
  "It's time to read!",
  "Press on toward the goal!",
  "Pursue Him and know Him!",
  "Extend your streak!",
  "Stay in the Word today",
  "Look away unto Jesus!",
  "There's a race for us to run, Hallelujah!",
];

function pickTitle(): string {
  return TITLES[Math.floor(Math.random() * TITLES.length)];
}

export async function GET(request: NextRequest) {
  // Vercel attaches `Authorization: Bearer <CRON_SECRET>` to cron invocations.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!ensurePushConfigured()) {
    return NextResponse.json(
      { error: "Push is not configured on the server." },
      { status: 500 }
    );
  }

  const admin = createAdminClient();

  // Test mode (?test=1): send a clearly-marked test push to everyone currently
  // opted in, regardless of readings, to verify delivery end-to-end.
  if (new URL(request.url).searchParams.get("test") === "1") {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth");
    const payload = JSON.stringify({
      title: "Test notification",
      body: "This is a test of the daily reading reminder. If you see this, notifications are working!",
      url: "/",
    });
    let sent = 0;
    let failed = 0;
    await Promise.all(
      (subs ?? []).map(async (s) => {
        const res = await sendPush(s, payload);
        if (res.ok) sent++;
        else {
          failed++;
          if (res.gone)
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", s.endpoint);
        }
      })
    );
    return NextResponse.json({ test: true, sent, failed });
  }

  const tz = process.env.REMINDER_TIMEZONE || "America/New_York";
  const today = todayInTz(tz);

  // Active challenges.
  const { data: challenges } = await admin
    .from("challenges")
    .select("id")
    .eq("status", "active");
  const challengeIds = (challenges ?? []).map((c) => c.id);
  if (challengeIds.length === 0) return NextResponse.json({ sent: 0, failed: 0 });

  // Today's reading per active challenge.
  const { data: readings } = await admin
    .from("readings")
    .select("id, display_text, challenge_id")
    .in("challenge_id", challengeIds)
    .eq("date", today);
  const readingByChallenge = new Map(
    (readings ?? []).map((r) => [r.challenge_id, r])
  );
  const challengesWithReading = [...readingByChallenge.keys()];
  const readingIds = (readings ?? []).map((r) => r.id);
  if (challengesWithReading.length === 0)
    return NextResponse.json({ sent: 0, failed: 0 });

  // Participants of those challenges.
  const { data: participants } = await admin
    .from("challenge_participants")
    .select("id, user_id, challenge_id")
    .in("challenge_id", challengesWithReading);

  // Who has already completed today's reading (to skip them).
  const { data: progress } = await admin
    .from("reading_progress")
    .select("participant_id, reading_id")
    .in("reading_id", readingIds);
  const completed = new Set(
    (progress ?? []).map((p) => `${p.participant_id}:${p.reading_id}`)
  );

  // Subscriptions by user.
  const userIds = [...new Set((participants ?? []).map((p) => p.user_id))];
  const { data: subs } = userIds.length
    ? await admin
        .from("push_subscriptions")
        .select("user_id, endpoint, p256dh, auth")
        .in("user_id", userIds)
    : { data: [] };
  const subsByUser = new Map<string, PushSub[]>();
  for (const s of subs ?? []) {
    const list = subsByUser.get(s.user_id) ?? [];
    list.push({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth });
    subsByUser.set(s.user_id, list);
  }

  // Collect each person's unread readings for today (across all their active
  // challenges), so we can send ONE notification per person — not per challenge.
  const pendingByUser = new Map<
    string,
    { challengeId: string; displayText: string }[]
  >();
  for (const p of participants ?? []) {
    const reading = readingByChallenge.get(p.challenge_id);
    if (!reading) continue;
    if (completed.has(`${p.id}:${reading.id}`)) continue;
    const list = pendingByUser.get(p.user_id) ?? [];
    list.push({ challengeId: p.challenge_id, displayText: reading.display_text });
    pendingByUser.set(p.user_id, list);
  }

  // One notification per person (per device).
  const jobs: { sub: PushSub; payload: string }[] = [];
  for (const [userId, pending] of pendingByUser) {
    const userSubs = subsByUser.get(userId);
    if (!userSubs?.length) continue;
    const title = pickTitle();
    const payload = JSON.stringify(
      pending.length === 1
        ? {
            title,
            body: `Today's reading is: ${pending[0].displayText}`,
            url: `/challenges/${pending[0].challengeId}`,
          }
        : {
            title,
            body: `You have today's readings waiting in ${pending.length} challenges.`,
            url: "/",
          }
    );
    for (const sub of userSubs) jobs.push({ sub, payload });
  }

  let sent = 0;
  let failed = 0;
  await Promise.all(
    jobs.map(async ({ sub, payload }) => {
      const res = await sendPush(sub, payload);
      if (res.ok) sent++;
      else {
        failed++;
        if (res.gone) {
          await admin
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }
    })
  );

  return NextResponse.json({ sent, failed, date: today });
}
