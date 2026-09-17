import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "../../../src/lib/supabase/server";
import {
  getMembership,
  getSessionProfile,
} from "../../../src/lib/session";
import AppHeader from "../../app-header";
import Tabs from "./tabs";

// Shared shell for a challenge: header + title + tabs stay mounted while the
// content below ({children}) swaps between Today / Leaderboard / Teams / Calendar.
export default async function ChallengeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Profile and membership are request-cached (shared with the page); the
  // challenge lookup runs alongside them.
  const [profile, { data: challenge }, participant] = await Promise.all([
    getSessionProfile(),
    supabase
      .from("challenges")
      .select("id, name, description")
      .eq("id", id)
      .single(),
    getMembership(id),
  ]);
  if (!challenge) notFound();

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        displayName={profile?.display_name}
        isAdmin={profile?.is_admin}
      />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-6 p-5">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-heading">
            ← Home
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-heading">
            {challenge.name}
          </h1>
          {challenge.description && (
            <p className="mt-1 text-sm text-muted">{challenge.description}</p>
          )}
        </div>

        {participant && <Tabs id={id} />}

        {children}
      </main>
    </div>
  );
}
