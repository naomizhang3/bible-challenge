import Link from "next/link";
import { createClient } from "../../src/lib/supabase/server";
import ProfileForm from "./profile-form";

// Protected by the proxy; a signed-in user is guaranteed here.
export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, created_at")
    .eq("id", user!.id)
    .single();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Profile</h1>
        <Link
          href="/"
          className="text-sm text-black/60 underline dark:text-white/60"
        >
          Home
        </Link>
      </div>

      <p className="text-sm text-black/60 dark:text-white/60">{user!.email}</p>

      <ProfileForm
        initialDisplayName={profile?.display_name ?? ""}
        initialAvatarUrl={profile?.avatar_url ?? ""}
      />
    </main>
  );
}
