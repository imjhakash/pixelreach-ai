import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { ProfilesClient } from "@/components/profiles/profiles-client";

export default async function ProfilesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profiles }, { data: accounts }] = await Promise.all([
    supabase
      .from("sender_profiles")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("email_accounts")
      .select("*")
      .eq("user_id", user!.id)
      .order("rotation_order", { ascending: true }),
  ]);

  return (
    <div>
      <Header title="Sender Profiles" subtitle="Manage your company profiles, SMTP accounts, and AI settings" />
      <ProfilesClient initialProfiles={profiles ?? []} initialAccounts={accounts ?? []} userId={user!.id} />
    </div>
  );
}
