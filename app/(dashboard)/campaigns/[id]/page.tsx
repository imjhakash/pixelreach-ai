import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import {
  CampaignDetail,
  type EmailSendRow,
  type AccountStatus,
  type TrackingEvent,
  type LiveCounts,
} from "@/components/campaigns/campaign-detail";
import { notFound } from "next/navigation";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, sender_profiles(id, company_name, daily_limit), lead_lists(name), follow_ups(*)")
    .eq("id", id)
    .eq("user_id", user!.id)
    .single();

  if (!campaign) notFound();

  // Live count helper — bypasses cached campaigns.* counters
  const cnt = async (build: (q: ReturnType<typeof statusBase>) => ReturnType<typeof statusBase>) => {
    const { count } = await build(statusBase());
    return count ?? 0;
  };
  function statusBase() {
    return supabase
      .from("email_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", id);
  }

  const [
    sentTotal,
    failedTotal,
    pendingTotal,
    bouncedTotal,
    openedTotal,
    clickedTotal,
    repliedTotal,
  ] = await Promise.all([
    cnt((q) => q.eq("status", "sent")),
    cnt((q) => q.eq("status", "failed")),
    cnt((q) => q.in("status", ["pending_gen", "ready"])),
    cnt((q) => q.eq("status", "bounced")),
    cnt((q) => q.not("opened_at", "is", null)),
    cnt((q) => q.not("clicked_at", "is", null)),
    cnt((q) => q.not("replied_at", "is", null)),
  ]);

  const liveCounts: LiveCounts = {
    sent: sentTotal,
    failed: failedTotal,
    pending: pendingTotal,
    bounced: bouncedTotal,
    opened: openedTotal,
    clicked: clickedTotal,
    replied: repliedTotal,
  };

  // Recent sends sample (200 rows for table display)
  const { data: recentSends } = await supabase
    .from("email_sends")
    .select("id, status, subject, sent_at, opened_at, clicked_at, open_count, click_count, error_message, created_at, leads(first_name, last_name, email, company)")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(200);

  // Email accounts attached to this campaign's sender profile (for daily-limit panel)
  const profileId = campaign.sender_profiles?.id;
  const { data: accounts } = profileId
    ? await supabase
        .from("email_accounts")
        .select("id, label, from_email, daily_sent, daily_reset_at, is_active, smtp_host")
        .eq("sender_profile_id", profileId)
        .order("rotation_order", { ascending: true })
    : { data: [] };

  // Tracking events for this campaign (last 100)
  const { data: events } = await supabase
    .from("tracking_events")
    .select("id, event_type, created_at, ip_address, user_agent, metadata, email_sends!inner(campaign_id, leads(first_name, last_name, email))")
    .eq("email_sends.campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const dailyLimit = campaign.sender_profiles?.daily_limit ?? 50;
  const today = new Date().toISOString().slice(0, 10);
  const accountStatuses: AccountStatus[] = (accounts ?? []).map((a) => ({
    id: a.id,
    label: a.label,
    from_email: a.from_email,
    smtp_host: a.smtp_host,
    is_active: a.is_active,
    daily_limit: dailyLimit,
    daily_sent: a.daily_reset_at === today ? a.daily_sent : 0,
    daily_reset_at: a.daily_reset_at,
  }));

  return (
    <div>
      <Header
        title={campaign.name}
        subtitle={`${campaign.sender_profiles?.company_name ?? ""} · ${campaign.lead_lists?.name ?? ""}`}
      />
      <CampaignDetail
        campaign={campaign}
        recentSends={(recentSends ?? []) as unknown as EmailSendRow[]}
        liveCounts={liveCounts}
        accounts={accountStatuses}
        events={(events ?? []) as unknown as TrackingEvent[]}
      />
    </div>
  );
}
