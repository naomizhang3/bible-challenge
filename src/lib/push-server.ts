import webpush from "web-push";

let configured = false;

// Configure web-push lazily (never at module load — that runs during the build
// before env vars exist). Returns false if the VAPID env isn't set.
export function ensurePushConfigured(): boolean {
  if (configured) return true;
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export type PushSub = { endpoint: string; p256dh: string; auth: string };

// Send one notification. `gone` is true when the subscription is dead (404/410)
// and should be pruned by the caller.
export async function sendPush(
  sub: PushSub,
  payload: string
): Promise<{ ok: boolean; gone: boolean }> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    return { ok: true, gone: false };
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    return { ok: false, gone: status === 404 || status === 410 };
  }
}
