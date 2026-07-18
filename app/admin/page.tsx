import Link from "next/link";
import { getViewer } from "../../src/lib/admin";
import CreateChallenge from "./create-challenge";

export default async function AdminPage() {
  const { supabase, user, isAdmin } = await getViewer();

  // Global admins see everything; owners see only challenges they created.
  const query = supabase
    .from("challenges")
    .select("id, name, status, start_date, end_date, created_by")
    .order("start_date", { ascending: false });

  const { data: challenges } = isAdmin
    ? await query
    : await query.eq("created_by", user!.id);

  const hasAccess = isAdmin || (challenges && challenges.length > 0);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <Link
          href="/"
          className="text-sm text-black/60 underline dark:text-white/60"
        >
          Home
        </Link>
      </div>

      {!hasAccess && (
        <p className="text-black/60 dark:text-white/60">
          You don&apos;t have admin access. Ask a global admin to grant it, or to
          make you the owner of a challenge.
        </p>
      )}

      {isAdmin && <CreateChallenge />}

      {hasAccess && (
        <ul className="space-y-2">
          {challenges?.map((c) => (
            <li key={c.id}>
              <Link
                href={`/admin/challenges/${c.id}`}
                className="flex items-center justify-between rounded-lg border border-black/10 px-4 py-3 hover:bg-black/[.03] dark:border-white/15 dark:hover:bg-white/[.03]"
              >
                <span className="font-medium">{c.name}</span>
                <span className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">
                  {c.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
