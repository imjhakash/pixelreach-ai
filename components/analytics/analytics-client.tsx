"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Send, MailOpen, MousePointerClick, AlertTriangle, MessageSquare } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  reply_count: number;
  created_at: string;
}

interface TrackingEvent {
  event_type: string;
  created_at: string;
}

const tooltipStyle = {
  backgroundColor: "#161b27",
  border: "1px solid #2a3347",
  borderRadius: "8px",
  color: "#e8eaf0",
  fontSize: "12px",
};

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "muted"> = {
  active: "success",
  paused: "warning",
  draft: "muted",
  completed: "default",
};

export function AnalyticsClient({ campaigns, events }: { campaigns: Campaign[]; events: TrackingEvent[] }) {
  const totals = campaigns.reduce(
    (acc, c) => ({
      sent: acc.sent + c.sent_count,
      opened: acc.opened + c.open_count,
      clicked: acc.clicked + c.click_count,
      bounced: acc.bounced + c.bounce_count,
      replied: acc.replied + c.reply_count,
    }),
    { sent: 0, opened: 0, clicked: 0, bounced: 0, replied: 0 }
  );

  const eventsByDay = events.reduce<Record<string, Record<string, number>>>((acc, e) => {
    const day = format(new Date(e.created_at), "MMM d");
    if (!acc[day]) acc[day] = { opened: 0, clicked: 0, sent: 0 };
    const type = e.event_type === "opened" ? "opened" : e.event_type === "clicked" ? "clicked" : e.event_type === "sent" ? "sent" : null;
    if (type) acc[day][type]++;
    return acc;
  }, {});

  const lineData = Object.entries(eventsByDay)
    .slice(-14)
    .map(([day, counts]) => ({ day, ...counts }));

  const campaignBarData = campaigns.slice(0, 8).map((c) => ({
    name: c.name.length > 16 ? c.name.slice(0, 14) + "…" : c.name,
    sent: c.sent_count,
    opened: c.open_count,
    clicked: c.click_count,
    bounced: c.bounce_count,
  }));

  const statsCards = [
    { label: "Total Sent", value: totals.sent, icon: Send, color: "text-[var(--accent)]", bg: "bg-[var(--accent)]/10" },
    { label: "Total Opened", value: totals.opened, icon: MailOpen, color: "text-[var(--success)]", bg: "bg-[var(--success)]/10",
      rate: totals.sent > 0 ? `${Math.round((totals.opened / totals.sent) * 100)}%` : "—" },
    { label: "Total Clicked", value: totals.clicked, icon: MousePointerClick, color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10",
      rate: totals.sent > 0 ? `${Math.round((totals.clicked / totals.sent) * 100)}%` : "—" },
    { label: "Total Bounced", value: totals.bounced, icon: AlertTriangle, color: "text-[var(--danger)]", bg: "bg-[var(--danger)]/10",
      rate: totals.sent > 0 ? `${Math.round((totals.bounced / totals.sent) * 100)}%` : "—" },
    { label: "Total Replied", value: totals.replied, icon: MessageSquare, color: "text-[var(--accent)]", bg: "bg-[var(--accent)]/10",
      rate: totals.sent > 0 ? `${Math.round((totals.replied / totals.sent) * 100)}%` : "—" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map(({ label, value, icon: Icon, color, bg, rate }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider">{label}</p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-[var(--foreground)]">{value.toLocaleString()}</p>
              {rate && <p className={`text-xs mt-0.5 font-medium ${color}`}>{rate} rate</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity over time */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Over Time (last 14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {lineData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[var(--muted)] text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" />
                <XAxis dataKey="day" tick={{ fill: "#8b93a7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8b93a7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#8b93a7" }} />
                <Line type="monotone" dataKey="sent" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="opened" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clicked" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Per Campaign Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          {campaignBarData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-[var(--muted)] text-sm">No campaigns yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={campaignBarData} barSize={16}>
                <XAxis dataKey="name" tick={{ fill: "#8b93a7", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8b93a7", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.08)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: "#8b93a7" }} />
                <Bar dataKey="sent" fill="#6366f1" radius={[3, 3, 0, 0]} />
                <Bar dataKey="opened" fill="#22c55e" radius={[3, 3, 0, 0]} />
                <Bar dataKey="clicked" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="bounced" fill="#ef4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Campaign Table */}
      <Card>
        <CardHeader><CardTitle>All Campaigns</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  {["Campaign", "Status", "Sent", "Open%", "Click%", "Bounce%", "Reply%"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[var(--muted)] text-sm">No campaigns yet</td>
                  </tr>
                ) : campaigns.map((c) => {
                  const open = c.sent_count > 0 ? Math.round((c.open_count / c.sent_count) * 100) : 0;
                  const click = c.sent_count > 0 ? Math.round((c.click_count / c.sent_count) * 100) : 0;
                  const bounce = c.sent_count > 0 ? Math.round((c.bounce_count / c.sent_count) * 100) : 0;
                  const reply = c.sent_count > 0 ? Math.round((c.reply_count / c.sent_count) * 100) : 0;
                  return (
                    <tr key={c.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)]">{c.name}</td>
                      <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[c.status] ?? "muted"}>{c.status}</Badge></td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{c.sent_count.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[var(--success)] font-medium">{open}%</td>
                      <td className="px-4 py-3 text-[var(--warning)] font-medium">{click}%</td>
                      <td className="px-4 py-3 text-[var(--danger)] font-medium">{bounce}%</td>
                      <td className="px-4 py-3 text-[var(--accent)] font-medium">{reply}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
