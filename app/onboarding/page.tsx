import { redirect } from "next/navigation";
import { createClient } from "../../src/lib/supabase/server";
import { getSessionProfile } from "../../src/lib/session";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const profile = await getSessionProfile();

  // Already onboarded — nothing to do here.
  if (profile?.group_id) redirect("/");

  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .order("sort_order", { ascending: true });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl font-bold text-heading">
          Welcome{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}!
        </h1>
        <p className="mt-2 text-muted">
          Which group are you part of? This tailors the challenges you&apos;ll
          see.
        </p>
      </div>
      <OnboardingForm groups={groups ?? []} />
    </main>
  );
}
