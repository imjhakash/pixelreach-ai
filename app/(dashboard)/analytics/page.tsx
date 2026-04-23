import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { AnalyticsClient } from "@/components/analytics/analytics-client";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, sent_count, open_count, click_count, bounce_count, reply_count, status, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const campaignIds = (campaigns ?? []).map((c) => c.id);
  const { data: sendIds } = campaignIds.length > 0
    ? await supabase.from("email_sends").select("id").in("campaign_id", campaignIds)
    : { data: [] };

  const { data: events } = (sendIds ?? []).length > 0
    ? await supabase
        .from("tracking_events")
        .select("event_type, created_at")
        .in("email_send_id", (sendIds ?? []).map((s: { id: string }) => s.id))
        .order("created_at", { ascending: true })
        .limit(1000)
    : { data: [] };

  return (
    <div>
      <Header title="Analytics" subtitle="Deep dive into your email outreach performance" />
      <AnalyticsClient campaigns={campaigns ?? []} events={events ?? []} />
    </div>
  );
}
