import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { LeadListDetail } from "@/components/leads/lead-list-detail";
import { resolvePromptDefaults } from "@/lib/prompt-studio";
import { notFound } from "next/navigation";

export default async function LeadListPage({ params }: { params: Promise<{ listId: string }> }) {
  const { listId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: list } = await supabase
    .from("lead_lists")
    .select("*")
    .eq("id", listId)
    .eq("user_id", user!.id)
    .single();

  if (!list) notFound();

  const [{ data: leads }, { data: senderProfiles }, { data: emailAccounts }, { data: promptSettings }] =
    await Promise.all([
      supabase
        .from("leads")
        .select("*")
        .eq("list_id", listId)
        .order("created_at", { ascending: false }),
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
      supabase
        .from("prompt_studio_settings")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle(),
    ]);

  return (
    <div>
      <Header title={list.name} subtitle={`${leads?.length ?? 0} leads${list.location_tag ? ` · ${list.location_tag}` : ""}`} />
      <LeadListDetail
        list={list}
        initialLeads={leads ?? []}
        senderProfiles={senderProfiles ?? []}
        emailAccounts={emailAccounts ?? []}
        promptDefaults={resolvePromptDefaults(promptSettings ?? null)}
      />
    </div>
  );
}
