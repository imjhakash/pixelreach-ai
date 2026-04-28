"use client";

import { useState } from "react";
import {
  Send, MailOpen, MousePointerClick, AlertTriangle,
  Play, Pause, Clock, CheckCircle, XCircle, RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { apiFetch } from "@/lib/api-fetch";

interface EmailSendRow {
  id: string;
  status: string;
  subject: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  open_count: number;
  click_count: number;
  leads?: { first_name: string | null; last_name: string | null; email: string; company: string | null } | null;
}

interface CampaignDetailProps {
  campaign: {
    id: string;
    name: string;
    status: string;
    sent_count: number;
    open_count: number;
    click_count: number;
    bounce_count: number;
    total_leads: number;
    follow_ups?: { id: string; step: number; delay_days: number }[];
  };
  recentSends: EmailSendRow[];
}

const SEND_STATUS_ICON: Record<string, React.ReactNode> = {
  sent:     <CheckCircle className="h-4 w-4 text-[var(--success)]" />,
  failed:   <XCircle className="h-4 w-4 text-[var(--danger)]" />,
  bounced:  <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />,
  pending_gen: <RefreshCw className="h-4 w-4 text-[var(--muted)] animate-spin" />,
  ready:    <Clock className="h-4 w-4 text-[var(--warning)]" />,
};

export function CampaignDetail({ campaign, recentSends }: CampaignDetailProps) {
  const [status, setStatus] = useState(campaign.status);
  const [toggling, setToggling] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{ generated: number; sent: number } | null>(null);

  const openRate = campaign.sent_count > 0
    ? Math.round((campaign.open_count / campaign.sent_count) * 100) : 0;
  const clickRate = campaign.sent_count > 0
    ? Math.round((campaign.click_count / campaign.sent_count) * 100) : 0;
  const bounceRate = campaign.sent_count > 0
    ? Math.round((campaign.bounce_count / campaign.sent_count) * 100) : 0;
  const progress = campaign.total_leads > 0
    ? Math.round((campaign.sent_count / campaign.total_leads) * 100) : 0;

  async function processNow() {
    setProcessing(true);
    setProcessResult(null);
    const res = await apiFetch(`/api/campaigns/${campaign.id}/process`, { method: "POST" });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to process" }));
      alert(error);
      setProcessing(false);
      return;
    }
    const data = await res.json();
    setProcessResult(data);
    setProcessing(false);
    setTimeout(() => setProcessResult(null), 5000);
  }

  async function toggleStatus() {
    setToggling(true);
    const newStatus = status === "active" ? "paused" : "active";
    const res = await apiFetch(`/api/campaigns/${campaign.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to update campaign" }));
      alert(error);
      setToggling(false);
      return;
    }
    setStatus(newStatus);
    setToggling(false);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top controls */}
      <div className="flex items-center gap-3">
        <Badge variant={status === "active" ? "success" : status === "paused" ? "warning" : "muted"}>
          {status}
        </Badge>
        {status !== "completed" && (
          <Button variant="secondary" size="sm" onClick={toggleStatus} disabled={toggling}>
            {status === "active" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {status === "active" ? "Pause" : "Start"} Campaign
          </Button>
        )}
        {status === "active" && (
          <Button variant="secondary" size="sm" onClick={processNow} disabled={processing}>
            <RefreshCw className={`h-4 w-4 ${processing ? "animate-spin" : ""}`} />
            {processing ? "Processing…" : "Process Now"}
          </Button>
        )}
        {processResult && (
          <span className="text-xs text-[var(--success)] font-medium">
            Generated {processResult.generated} · Sent {processResult.sent}
          </span>
        )}
        {campaign.follow_ups && campaign.follow_ups.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted)]">
            <RefreshCw className="h-3.5 w-3.5" />
            {campaign.follow_ups.length} follow-up step{campaign.follow_ups.length > 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Sent", value: campaign.sent_count, icon: Send, color: "text-[var(--accent)]", bg: "bg-[var(--accent)]/10" },
          { label: "Opened", value: `${campaign.open_count} (${openRate}%)`, icon: MailOpen, color: "text-[var(--success)]", bg: "bg-[var(--success)]/10" },
          { label: "Clicked", value: `${campaign.click_count} (${clickRate}%)`, icon: MousePointerClick, color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10" },
          { label: "Bounced", value: `${campaign.bounce_count} (${bounceRate}%)`, icon: AlertTriangle, color: "text-[var(--danger)]", bg: "bg-[var(--danger)]/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider">{label}</p>
                <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${color}`} />
                </div>
              </div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-[var(--foreground)]">Send Progress</p>
            <p className="text-sm text-[var(--muted)]">{campaign.sent_count} / {campaign.total_leads} leads</p>
          </div>
          <div className="h-2 w-full rounded-full bg-[var(--surface-2)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--muted)] mt-1">{progress}% complete</p>
        </CardContent>
      </Card>

      {/* Email Sends Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Sends</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Subject</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Sent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Opens</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Clicks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentSends.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[var(--muted)] text-sm">
                      No emails sent yet
                    </td>
                  </tr>
                ) : (
                  recentSends.map((s) => (
                    <tr key={s.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--foreground)]">
                          {[s.leads?.first_name, s.leads?.last_name].filter(Boolean).join(" ") || s.leads?.email}
                        </p>
                        <p className="text-xs text-[var(--muted)]">{s.leads?.company ?? ""}</p>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-[var(--muted)]">
                        {s.subject ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted)] whitespace-nowrap">
                        {s.sent_at ? formatDistanceToNow(new Date(s.sent_at), { addSuffix: true }) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${s.open_count > 0 ? "text-[var(--success)]" : "text-[var(--muted)]"}`}>
                          {s.open_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-sm font-medium ${s.click_count > 0 ? "text-[var(--warning)]" : "text-[var(--muted)]"}`}>
                          {s.click_count}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {SEND_STATUS_ICON[s.status] ?? null}
                          <span className="text-xs text-[var(--muted)] capitalize">{s.status.replace("_", " ")}</span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
