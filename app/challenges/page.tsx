import Link from "next/link";
import { createClient } from "../../src/lib/supabase/server";
import JoinButton from "./join-button";

// Protected by the proxy; a signed-in user is guaranteed here.
export default async function ChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: challenges } = await supabase
    .from("challenges")
    .select("id, name, description, start_date, end_date")
    .eq("status", "active")
    .order("start_date", { ascending: true });

  const { data: memberships } = await supabase
    .from("challenge_participants")
    .select("challenge_id")
    .eq("user_id", user!.id);

  const joined = new Set((memberships ?? []).map((m) => m.challenge_id));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Challenges</h1>
        <Link
          href="/"
          className="text-sm text-black/60 underline dark:text-white/60"
        >
          Home
        </Link>
      </div>

      {(!challenges || challenges.length === 0) && (
        <p className="text-black/60 dark:text-white/60">
          No active challenges right now.
        </p>
      )}

      <ul className="space-y-4">
        {challenges?.map((c) => {
          const isJoined = joined.has(c.id);
          return (
            <li
              key={c.id}
              className="rounded-xl border border-black/10 p-5 dark:border-white/15"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium">{c.name}</h2>
                  {c.description && (
                    <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                      {c.description}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                    {c.start_date} → {c.end_date}
                  </p>
                </div>
                {isJoined ? (
                  <Link
                    href={`/challenges/${c.id}`}
                    className="shrink-0 rounded-md bg-foreground px-4 py-2 text-sm text-background"
                  >
                    Open
                  </Link>
                ) : (
                  <JoinButton challengeId={c.id} />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
