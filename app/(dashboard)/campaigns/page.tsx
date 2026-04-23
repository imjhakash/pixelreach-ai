import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CampaignsClient } from "@/components/campaigns/campaigns-client";
import { resolvePromptDefaults } from "@/lib/prompt-studio";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: campaigns }, { data: profiles }, { data: lists }, { data: promptSettings }] = await Promise.all([
    supabase
      .from("campaigns")
      .select("*, sender_profiles(company_name), lead_lists(name)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sender_profiles")
      .select("id, company_name")
      .eq("user_id", user!.id),
    supabase
      .from("lead_lists")
      .select("id, name, total_leads")
      .eq("user_id", user!.id),
    supabase
      .from("prompt_studio_settings")
      .select("*")
      .eq("user_id", user!.id)
      .maybeSingle(),
  ]);

  const promptDefaults = resolvePromptDefaults(promptSettings ?? null);

  return (
    <div>
      <Header title="Campaigns" subtitle="Create and manage your email outreach campaigns" />
      <CampaignsClient
        initialCampaigns={campaigns ?? []}
        profiles={profiles ?? []}
        lists={lists ?? []}
        promptDefaults={promptDefaults}
      />
    </div>
  );
}
