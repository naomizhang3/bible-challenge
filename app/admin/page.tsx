import Link from "next/link";
import { getViewer } from "../../src/lib/admin";
import AppHeader from "../app-header";
import CreateChallenge from "./create-challenge";

export default async function AdminPage() {
  const { supabase, user, isAdmin } = await getViewer();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const query = supabase
    .from("challenges")
    .select("id, name, status, start_date, end_date, created_by")
    .order("start_date", { ascending: false });

  const { data: challenges } = isAdmin
    ? await query
    : await query.eq("created_by", user!.id);

  const hasAccess = isAdmin || (challenges && challenges.length > 0);

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        displayName={profile?.display_name}
        avatarUrl={profile?.avatar_url}
        isAdmin={isAdmin}
      />
      <main className="mx-auto w-full max-w-xl flex-1 space-y-5 p-5">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-heading">
            ← Home
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-bold text-heading">
            Admin
          </h1>
        </div>

        {!hasAccess && (
          <div className="rounded-2xl border border-hair bg-surface p-6 text-center text-muted shadow-sm">
            You don&apos;t have admin access. Ask a global admin to grant it, or
            to make you the owner of a challenge.
          </div>
        )}

        {isAdmin && <CreateChallenge />}

        {hasAccess && (
          <div className="space-y-3">
            {challenges?.map((c) => (
              <Link
                key={c.id}
                href={`/admin/challenges/${c.id}`}
                className="flex items-center justify-between rounded-2xl border border-hair bg-surface p-4 shadow-sm transition hover:shadow-md"
              >
                <span className="font-serif text-lg font-semibold text-heading">
                  {c.name}
                </span>
                <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted">
                  {c.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
