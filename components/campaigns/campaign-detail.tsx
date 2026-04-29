"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Send, MailOpen, MousePointerClick, AlertTriangle,
  Play, Pause, Clock, CheckCircle, XCircle, RefreshCw, RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { apiFetch } from "@/lib/api-fetch";

export interface EmailSendRow {
  id: string;
  status: string;
  subject: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  open_count: number;
  click_count: number;
  error_message: string | null;
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

const STATUS_ICON: Record<string, React.ReactNode> = {
  sent:        <CheckCircle className="h-4 w-4 text-[var(--success)]" />,
  failed:      <XCircle className="h-4 w-4 text-[var(--danger)]" />,
  bounced:     <AlertTriangle className="h-4 w-4 text-[var(--danger)]" />,
  pending_gen: <RefreshCw className="h-4 w-4 text-[var(--muted)] animate-spin" />,
  ready:       <Clock className="h-4 w-4 text-[var(--warning)]" />,
  pending:     <Clock className="h-4 w-4 text-[var(--muted)]" />,
};

const LOG_TABS = ["All", "Failed", "Sent", "Pending"] as const;
type LogTab = typeof LOG_TABS[number];

export function CampaignDetail({ campaign, recentSends }: CampaignDetailProps) {
  const router = useRouter();
  const [status, setStatus] = useState(campaign.status);
  const [toggling, setToggling] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{ generated: number; sent: number } | null>(null);
  const [activeTab, setActiveTab] = useState<LogTab>("All");
  const [retryingAll, setRetryingAll] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const openRate = campaign.sent_count > 0
    ? Math.round((campaign.open_count / campaign.sent_count) * 100) : 0;
  const clickRate = campaign.sent_count > 0
    ? Math.round((campaign.click_count / campaign.sent_count) * 100) : 0;
  const bounceRate = campaign.sent_count > 0
    ? Math.round((campaign.bounce_count / campaign.sent_count) * 100) : 0;
  const progress = campaign.total_leads > 0
    ? Math.round((campaign.sent_count / campaign.total_leads) * 100) : 0;

  const failedCount = useMemo(
    () => recentSends.filter((s) => s.status === "failed").length,
    [recentSends]
  );

  const filteredSends = useMemo(() => {
    switch (activeTab) {
      case "Failed":  return recentSends.filter((s) => s.status === "failed");
      case "Sent":    return recentSends.filter((s) => s.status === "sent");
      case "Pending": return recentSends.filter((s) => ["pending_gen", "ready", "pending"].includes(s.status));
      default:        return recentSends;
    }
  }, [recentSends, activeTab]);

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
    setTimeout(() => {
      setProcessResult(null);
      router.refresh();
    }, 3000);
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

  async function retryAll() {
    setRetryingAll(true);
    const res = await apiFetch(`/api/campaigns/${campaign.id}/retry-failed`, { method: "POST" });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to retry" }));
      alert(error);
      setRetryingAll(false);
      return;
    }
    setRetryingAll(false);
    router.refresh();
  }

  async function retrySingle(sendId: string) {
    setRetryingId(sendId);
    const res = await apiFetch(`/api/campaigns/${campaign.id}/retry-failed`, {
      method: "POST",
      body: JSON.stringify({ send_id: sendId }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to retry" }));
      alert(error);
      setRetryingId(null);
      return;
    }
    setRetryingId(null);
    router.refresh();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top controls */}
      <div className="flex items-center gap-3 flex-wrap">
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
          { label: "Sent",    value: campaign.sent_count,                             icon: Send,               color: "text-[var(--accent)]",   bg: "bg-[var(--accent)]/10" },
          { label: "Opened",  value: `${campaign.open_count} (${openRate}%)`,         icon: MailOpen,           color: "text-[var(--success)]",  bg: "bg-[var(--success)]/10" },
          { label: "Clicked", value: `${campaign.click_count} (${clickRate}%)`,       icon: MousePointerClick,  color: "text-[var(--warning)]",  bg: "bg-[var(--warning)]/10" },
          { label: "Bounced", value: `${campaign.bounce_count} (${bounceRate}%)`,     icon: AlertTriangle,      color: "text-[var(--danger)]",   bg: "bg-[var(--danger)]/10" },
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

      {/* Email Logs */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <CardTitle>Email Logs</CardTitle>
              <span className="text-xs text-[var(--muted)]">{recentSends.length} records</span>
              {failedCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--danger)]/10 px-2 py-0.5 text-xs font-medium text-[var(--danger)]">
                  <XCircle className="h-3 w-3" />
                  {failedCount} failed
                </span>
              )}
            </div>
            {failedCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={retryAll}
                disabled={retryingAll}
                className="text-[var(--danger)] border-[var(--danger)]/30 hover:bg-[var(--danger)]/10"
              >
                <RotateCcw className={`h-4 w-4 ${retryingAll ? "animate-spin" : ""}`} />
                {retryingAll ? "Retrying…" : `Retry All Failed (${failedCount})`}
              </Button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-[var(--border)]">
            {LOG_TABS.map((tab) => {
              const count =
                tab === "All"     ? recentSends.length :
                tab === "Failed"  ? recentSends.filter((s) => s.status === "failed").length :
                tab === "Sent"    ? recentSends.filter((s) => s.status === "sent").length :
                recentSends.filter((s) => ["pending_gen", "ready", "pending"].includes(s.status)).length;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === tab
                      ? "border-[var(--accent)] text-[var(--accent)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {tab}
                  {count > 0 && (
                    <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${
                      activeTab === tab
                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                        : "bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Lead</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Subject / Error</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Sent</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Opens</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Clicks</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredSends.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-[var(--muted)] text-sm">
                      No records
                    </td>
                  </tr>
                ) : (
                  filteredSends.map((s) => {
                    const isFailed = s.status === "failed";
                    return (
                      <tr
                        key={s.id}
                        className={`transition-colors ${
                          isFailed
                            ? "bg-[var(--danger)]/5 hover:bg-[var(--danger)]/10"
                            : "hover:bg-[var(--surface-2)]/50"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <p className={`font-medium ${isFailed ? "text-[var(--danger)]" : "text-[var(--foreground)]"}`}>
                            {[s.leads?.first_name, s.leads?.last_name].filter(Boolean).join(" ") || s.leads?.email}
                          </p>
                          <p className="text-xs text-[var(--muted)]">{s.leads?.company ?? ""}</p>
                        </td>
                        <td className="px-4 py-3 max-w-[280px]">
                          {isFailed && s.error_message ? (
                            <div>
                              {s.subject && (
                                <p className="text-xs text-[var(--muted)] truncate mb-0.5">{s.subject}</p>
                              )}
                              <p className="text-xs text-[var(--danger)] font-medium break-words leading-snug">
                                {s.error_message}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[var(--muted)] truncate block">{s.subject ?? "—"}</span>
                          )}
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
                            {STATUS_ICON[s.status] ?? null}
                            <span className={`text-xs capitalize ${isFailed ? "text-[var(--danger)] font-medium" : "text-[var(--muted)]"}`}>
                              {s.status.replace("_", " ")}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {isFailed && (
                            <button
                              onClick={() => retrySingle(s.id)}
                              disabled={retryingId === s.id}
                              title="Retry this email"
                              className="flex items-center justify-center rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className={`h-3.5 w-3.5 ${retryingId === s.id ? "animate-spin" : ""}`} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
