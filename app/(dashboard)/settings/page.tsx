import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Zap, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import { SettingsClient } from "@/components/settings/settings-client";

const CAMPAIGN_WORKER_JOB = {
  title: "PixelReach - Campaign Worker",
  path: "/api/jobs/campaign-worker",
  freq: "Every 1 min",
  cron: "* * * * *",
  desc: "Generates the next email, sends one due email, and schedules follow-ups",
};

const ADVANCED_JOB_ENDPOINTS = [
  {
    title: "PixelReach - Generate Emails",
    path: "/api/jobs/generate-emails",
    freq: "Every 1 min",
    cron: "* * * * *",
    desc: "Pre-generate AI email bodies for pending sends",
  },
  {
    title: "PixelReach - Send Queue",
    path: "/api/jobs/process-send-queue",
    freq: "Every 1 min",
    cron: "* * * * *",
    desc: "Send queued emails via SMTP",
  },
  {
    title: "PixelReach - Follow-ups",
    path: "/api/jobs/process-followups",
    freq: "Every 5 min",
    cron: "*/5 * * * *",
    desc: "Schedule follow-up emails that are due",
  },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app";

  return (
    <div>
      <Header title="Settings" subtitle="System configuration and infrastructure info" />
      <div className="p-6 space-y-6">

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-xs text-[var(--muted)] w-24 shrink-0">Email</p>
              <p className="text-sm text-[var(--foreground)]">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-[var(--muted)] w-24 shrink-0">User ID</p>
              <p className="text-sm text-[var(--foreground)] font-mono">{user?.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>Infrastructure (Free Tier)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { service: "Next.js App", provider: "Vercel Hobby", status: "active", detail: "Free · 100GB bandwidth/mo" },
                { service: "Database", provider: "Supabase Free", status: "active", detail: "500MB Postgres + Auth + Storage" },
                { service: "AI Generation", provider: "OpenRouter", status: "active", detail: "User's own API key — pay per use" },
                { service: "Email Sending", provider: "Nodemailer / SMTP", status: "active", detail: "User's own Gmail/SMTP accounts" },
                { service: "Cron Jobs", provider: "Vercel Cron", status: "active", detail: "vercel.json → /api/jobs/campaign-worker every 1 min (Pro)" },
                { service: "Tracking Domain", provider: "Cloudflare", status: "active", detail: "Open pixel + click redirect" },
              ].map(({ service, provider, status, detail }) => (
                <div key={service} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{service}</p>
                    <p className="text-xs text-[var(--muted)]">{provider} · {detail}</p>
                  </div>
                  <Badge variant="success">{status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Vercel Cron (primary) */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>Vercel Cron (recommended)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-[var(--muted)]">
              This repo ships <code className="bg-[var(--surface-2)] px-1 rounded">vercel.json</code> with one cron that hits{" "}
              <code className="bg-[var(--surface-2)] px-1 rounded">/api/jobs/campaign-worker</code> every minute (
              <code className="bg-[var(--surface-2)] px-1 rounded">* * * * *</code> UTC). After deploy, confirm it under{" "}
              <strong>Project → Settings → Cron Jobs</strong>.
            </p>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 space-y-2 text-xs text-[var(--muted)]">
              <p><span className="text-[var(--foreground)] font-medium">1.</span> Add <code className="bg-[var(--surface)] px-1 rounded">CRON_SECRET</code> (16+ random chars) to Vercel → Environment Variables for Production.</p>
              <p><span className="text-[var(--foreground)] font-medium">2.</span> Redeploy. Vercel automatically sends <code className="bg-[var(--surface)] px-1 rounded">Authorization: Bearer {"{CRON_SECRET}"}</code> on cron invocations — your route already verifies this.</p>
              <p><span className="text-[var(--foreground)] font-medium">3.</span> Worker URL (for reference):</p>
              <code className="block text-xs font-mono text-[var(--accent)] break-all">{appUrl}{CAMPAIGN_WORKER_JOB.path}</code>
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-[var(--muted)]">
              <p className="font-medium text-[var(--foreground)] mb-1">Vercel Hobby vs Pro</p>
              <p>
                Hobby teams can only deploy cron schedules that run <strong>once per day</strong>. A per-minute schedule may fail at deploy time with “limited to daily cron jobs”.
                Use <strong>Vercel Pro</strong> for minute-level cron, or use the external cron fallback below.
              </p>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <a href="https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs" target="_blank" rel="noreferrer">
                Vercel: securing cron jobs (CRON_SECRET)
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </CardContent>
        </Card>

        {/* External cron — Hobby / backup */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>External cron (Hobby / backup)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Optional: cron-job.org</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  If you stay on Hobby or want redundancy, create one GET job to the same worker URL with{" "}
                  <code className="bg-[var(--surface)] px-1 rounded">Authorization: Bearer CRON_SECRET</code>.
                </p>
              </div>
              <Button asChild variant="secondary" className="shrink-0">
                <a href="https://cron-job.org/en/" target="_blank" rel="noreferrer">
                  Open cron-job.org
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs font-semibold text-[var(--foreground)] mb-2">Form settings</p>
                <div className="space-y-2 text-xs text-[var(--muted)]">
                  <p><span className="text-[var(--foreground)]">URL:</span> paste the full worker URL below.</p>
                  <p><span className="text-[var(--foreground)]">Execution schedule:</span> Custom → <code className="bg-[var(--surface-2)] px-1 rounded">{CAMPAIGN_WORKER_JOB.cron}</code></p>
                  <p><span className="text-[var(--foreground)]">Notify me:</span> enable failure notifications.</p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs font-semibold text-[var(--foreground)] mb-2">Request settings</p>
                <div className="space-y-2 text-xs text-[var(--muted)]">
                  <p><span className="text-[var(--foreground)]">Method:</span> GET · <span className="text-[var(--foreground)]">Body:</span> empty</p>
                  <p><span className="text-[var(--foreground)]">Header:</span> Authorization</p>
                  <code className="block overflow-x-auto rounded bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--accent)]">
                    Bearer your_cron_secret_token
                  </code>
                  <p>Must match Vercel <code className="bg-[var(--surface-2)] px-1 rounded">CRON_SECRET</code>.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--foreground)]">Worker URL</p>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">{CAMPAIGN_WORKER_JOB.title}</p>
                    <code className="block text-xs font-mono text-[var(--accent)] break-all">
                      {appUrl}{CAMPAIGN_WORKER_JOB.path}
                    </code>
                    <p className="text-xs text-[var(--muted)]">{CAMPAIGN_WORKER_JOB.desc}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Badge variant="muted">{CAMPAIGN_WORKER_JOB.freq}</Badge>
                    <code className="rounded bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]">
                      {CAMPAIGN_WORKER_JOB.cron}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cron Endpoints */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>Cron Job Endpoints</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-[var(--muted)]">
              Primary path: <strong>Vercel Cron</strong> hits <code className="bg-[var(--surface-2)] px-1 rounded">/api/jobs/campaign-worker</code> using{" "}
              <code className="bg-[var(--surface-2)] px-1 rounded">Authorization: Bearer CRON_SECRET</code>. The endpoints below are optional if you split jobs manually.
            </p>
            {[
              CAMPAIGN_WORKER_JOB,
              ...ADVANCED_JOB_ENDPOINTS,
              { path: "/api/imap/ingest", freq: "Webhook", desc: "Receive bounce/reply data from your IMAP poller" },
            ].map(({ path, freq, desc }) => (
              <div key={path} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                <div className="flex items-center justify-between mb-1">
                  <code className="text-xs font-mono text-[var(--accent)]">{path}</code>
                  <Badge variant="muted">{freq}</Badge>
                </div>
                <p className="text-xs text-[var(--muted)]">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Environment Variables Checklist */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>Environment Variables</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--muted)] mb-3">Required in your <code className="bg-[var(--surface-2)] px-1 rounded">.env.local</code> file. See <code className="bg-[var(--surface-2)] px-1 rounded">env.template</code> for reference.</p>
            <div className="space-y-2">
              {[
                "NEXT_PUBLIC_SUPABASE_URL",
                "NEXT_PUBLIC_SUPABASE_ANON_KEY",
                "SUPABASE_SERVICE_ROLE_KEY",
                "ENCRYPTION_KEY",
                "CRON_SECRET",
                "NEXT_PUBLIC_APP_URL",
              ].map((v) => (
                <div key={v} className="flex items-center gap-2">
                  <Zap className="h-3 w-3 text-[var(--accent)] shrink-0" />
                  <code className="text-xs font-mono text-[var(--foreground)]">{v}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live connection tests */}
        <SettingsClient userEmail={user?.email ?? ""} />
      </div>
    </div>
  );
}
