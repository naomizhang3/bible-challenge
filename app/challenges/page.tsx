import Link from "next/link";
import { createClient } from "../../src/lib/supabase/server";
import AppHeader from "../app-header";
import JoinButton from "./join-button";

export default async function ChallengesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, is_admin")
    .eq("id", user!.id)
    .single();

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
    <div className="flex flex-1 flex-col">
      <AppHeader
        displayName={profile?.display_name}
        avatarUrl={profile?.avatar_url}
        isAdmin={profile?.is_admin}
      />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-5 p-5">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-heading">
            ← Home
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-bold text-heading">
            Challenges
          </h1>
          <p className="text-sm text-muted">
            Join a challenge to start reading with your community.
          </p>
        </div>

        {(!challenges || challenges.length === 0) && (
          <div className="rounded-2xl border border-hair bg-surface p-6 text-center text-muted shadow-sm">
            No active challenges right now.
          </div>
        )}

        <div className="space-y-3">
          {challenges?.map((c) => {
            const isJoined = joined.has(c.id);
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-hair bg-surface p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-serif text-lg font-semibold text-heading">
                      {c.name}
                    </h2>
                    {c.description && (
                      <p className="mt-1 text-sm text-muted">
                        {c.description}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-muted">
                      {c.start_date} → {c.end_date}
                    </p>
                  </div>
                  {isJoined ? (
                    <Link
                      href={`/challenges/${c.id}`}
                      className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white"
                    >
                      Open →
                    </Link>
                  ) : (
                    <JoinButton challengeId={c.id} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
