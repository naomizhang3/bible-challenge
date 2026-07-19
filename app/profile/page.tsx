import { createClient } from "../../src/lib/supabase/server";
import AppHeader from "../app-header";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, is_admin")
    .eq("id", user!.id)
    .single();

  const initial =
    (profile?.display_name ?? "").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader
        displayName={profile?.display_name}
        isAdmin={profile?.is_admin}
      />
      <main className="mx-auto w-full max-w-md flex-1 space-y-6 p-5">
        <h1 className="font-serif text-3xl font-bold text-heading">Profile</h1>

        <div className="flex items-center gap-4 rounded-2xl border border-hair bg-surface p-5 shadow-sm">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-semibold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <div className="truncate font-serif text-xl font-semibold text-heading">
              {profile?.display_name ?? "—"}
            </div>
            <div className="truncate text-sm text-muted">{user!.email}</div>
          </div>
        </div>

        <div className="rounded-2xl border border-hair bg-surface p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-muted">
            Edit profile
          </h2>
          <ProfileForm initialDisplayName={profile?.display_name ?? ""} />
        </div>
      </main>
    </div>
  );
}
