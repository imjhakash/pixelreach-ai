import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CampaignDetail, type EmailSendRow } from "@/components/campaigns/campaign-detail";
import { notFound } from "next/navigation";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, sender_profiles(company_name), lead_lists(name), follow_ups(*)")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!campaign) notFound();

  const { data: recentSends } = await supabase
    .from("email_sends")
    .select("id, status, subject, sent_at, opened_at, clicked_at, open_count, click_count, error_message, created_at, leads(first_name, last_name, email, company)")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <Header
        title={campaign.name}
        subtitle={`${campaign.sender_profiles?.company_name ?? ""} · ${campaign.lead_lists?.name ?? ""}`}
      />
      <CampaignDetail campaign={campaign} recentSends={(recentSends ?? []) as unknown as EmailSendRow[]} />
    </div>
  );
}
