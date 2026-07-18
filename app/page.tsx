import Link from "next/link";
import { createClient } from "../src/lib/supabase/server";
import InstallPrompt from "./install-prompt";

// Server Component: the proxy guarantees a signed-in user reaches this page.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, is_admin")
    .eq("id", user!.id)
    .single();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Bible Reading Challenge</h1>
        <p className="mt-2 text-black/60 dark:text-white/60">
          Signed in as{" "}
          <span className="font-medium">
            {profile?.display_name ?? user!.email}
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/challenges"
          className="rounded-md bg-foreground px-4 py-2 text-sm text-background"
        >
          Challenges
        </Link>
        <Link
          href="/profile"
          className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20"
        >
          Profile
        </Link>
        {profile?.is_admin && (
          <Link
            href="/admin"
            className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20"
          >
            Admin
          </Link>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-md border border-black/15 px-4 py-2 text-sm dark:border-white/20"
          >
            Sign out
          </button>
        </form>
      </div>

      <InstallPrompt />
    </main>
  );
}
