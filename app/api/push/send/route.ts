import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { createClient } from "../../../../src/lib/supabase/server";

// web-push needs the Node runtime (not Edge).
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) {
    return NextResponse.json(
      { error: "Push is not configured on the server." },
      { status: 500 }
    );
  }
  // Configure web-push per request (not at module load, which would run during
  // the build before env vars are available).
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { challengeId, title, body, url } = await request.json();
  if (!challengeId || !title?.trim() || !body?.trim()) {
    return NextResponse.json(
      { error: "Missing challenge, title, or message." },
      { status: 400 }
    );
  }

  // The RPC enforces can_admin_challenge(cid): a non-admin gets zero rows.
  const { data: subs, error } = await supabase.rpc(
    "push_subscriptions_for_challenge",
    { cid: challengeId }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const payload = JSON.stringify({
    title: title.trim(),
    body: body.trim(),
    url: url || `/challenges/${challengeId}`,
  });

  let sent = 0;
  let failed = 0;
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          },
          payload
        );
        sent++;
      } catch (e: unknown) {
        failed++;
        // 404/410 means the subscription is dead — prune it.
        const status = (e as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await supabase.rpc("delete_push_subscription", {
            p_endpoint: s.endpoint,
          });
        }
      }
    })
  );

  return NextResponse.json({ sent, failed });
}
