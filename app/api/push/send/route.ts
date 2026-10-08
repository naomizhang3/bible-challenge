import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "../../../../src/lib/supabase/server";
import { ensurePushConfigured, sendPush } from "../../../../src/lib/push-server";

// web-push needs the Node runtime (not Edge).
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!ensurePushConfigured()) {
    return NextResponse.json(
      { error: "Push is not configured on the server." },
      { status: 500 }
    );
  }

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
      const res = await sendPush(s, payload);
      if (res.ok) sent++;
      else {
        failed++;
        if (res.gone) {
          await supabase.rpc("delete_push_subscription", {
            p_endpoint: s.endpoint,
          });
        }
      }
    })
  );

  return NextResponse.json({ sent, failed });
}
