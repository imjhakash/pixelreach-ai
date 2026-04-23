import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { LeadsClient } from "@/components/leads/leads-client";

export default async function LeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: lists } = await supabase
    .from("lead_lists")
    .select("*, leads(count)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <Header title="Leads" subtitle="Upload, organize and manage your lead lists here" />
      <LeadsClient initialLists={lists ?? []} />
    </div>
  );
}
