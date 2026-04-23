import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send, MailOpen, MousePointerClick, AlertTriangle,
  TrendingUp, Users, Zap, Activity,
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/charts";

async function getDashboardStats(userId: string) {
  const supabase = await createClient();

  const [sendsResult, campaignsResult, leadsResult] = await Promise.all([
    supabase
      .from("email_sends")
      .select("status, opened_at, clicked_at")
      .in("status", ["sent", "bounced", "failed"])
      .eq(
        "campaign_id",
        supabase.from("campaigns").select("id").eq("user_id", userId)
      ),
    supabase.from("campaigns").select("id, name, status, sent_count, open_count, click_count, bounce_count, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  const sends = sendsResult.data ?? [];
  const total_sent = sends.filter((s) => s.status === "sent").length;
  const total_bounced = sends.filter((s) => s.status === "bounced").length;
  const total_opened = sends.filter((s) => s.opened_at).length;
  const total_clicked = sends.filter((s) => s.clicked_at).length;

  return {
    total_sent,
    total_bounced,
    total_opened,
    total_clicked,
    open_rate: total_sent > 0 ? Math.round((total_opened / total_sent) * 100) : 0,
    click_rate: total_sent > 0 ? Math.round((total_clicked / total_sent) * 100) : 0,
    bounce_rate: total_sent > 0 ? Math.round((total_bounced / total_sent) * 100) : 0,
    recent_campaigns: campaignsResult.data ?? [],
    total_leads: leadsResult.count ?? 0,
  };
}

const statCards = [
  {
    key: "total_sent",
    label: "Total Sent",
    icon: Send,
    color: "text-[var(--accent)]",
    bg: "bg-[var(--accent)]/10",
  },
  {
    key: "total_opened",
    label: "Opened",
    icon: MailOpen,
    color: "text-[var(--success)]",
    bg: "bg-[var(--success)]/10",
    rateKey: "open_rate",
  },
  {
    key: "total_clicked",
    label: "Clicked",
    icon: MousePointerClick,
    color: "text-[var(--warning)]",
    bg: "bg-[var(--warning)]/10",
    rateKey: "click_rate",
  },
  {
    key: "total_bounced",
    label: "Bounced",
    icon: AlertTriangle,
    color: "text-[var(--danger)]",
    bg: "bg-[var(--danger)]/10",
    rateKey: "bounce_rate",
  },
];

const campaignStatusVariant: Record<string, "default" | "success" | "warning" | "muted"> = {
  active: "success",
  paused: "warning",
  draft: "muted",
  completed: "default",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const stats = await getDashboardStats(user!.id);

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Overview of your outreach performance"
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ key, label, icon: Icon, color, bg, rateKey }) => {
            const value = stats[key as keyof typeof stats] as number;
            const rate = rateKey ? (stats[rateKey as keyof typeof stats] as number) : null;
            return (
              <Card key={key} className="relative overflow-hidden">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">{label}</p>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${bg}`}>
                      <Icon className={`h-4 w-4 ${color}`} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-[var(--foreground)]">
                    {value.toLocaleString()}
                  </p>
                  {rate !== null && (
                    <p className={`text-xs mt-1 font-medium ${color}`}>
                      {rate}% rate
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Extra quick stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                <Users className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider">Total Leads</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total_leads.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--success)]/10">
                <TrendingUp className="h-5 w-5 text-[var(--success)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider">Open Rate</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">{stats.open_rate}%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <DashboardCharts stats={stats} />

        {/* Recent Campaigns */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>Recent Campaigns</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {stats.recent_campaigns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[var(--muted)]">
                <Zap className="h-8 w-8 mb-3 opacity-30" />
                <p className="text-sm">No campaigns yet. Create your first one!</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {stats.recent_campaigns.map((c: {
                  id: string; name: string; status: string;
                  sent_count: number; open_count: number; click_count: number; bounce_count: number;
                }) => (
                  <div key={c.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--surface-2)]/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                        <Send className="h-4 w-4 text-[var(--muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">{c.name}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {c.sent_count} sent · {c.open_count} opened · {c.click_count} clicked
                        </p>
                      </div>
                    </div>
                    <Badge variant={campaignStatusVariant[c.status] ?? "muted"}>
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
