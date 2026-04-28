import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Zap, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import { SettingsClient } from "@/components/settings/settings-client";

const CRON_JOBS = [
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
                { service: "Cron Jobs", provider: "cron-job.org", status: "active", detail: "Every 1 min send · Every 5 min follow-ups" },
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

        {/* cron-job.org Setup */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>cron-job.org Setup Flow</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Create 3 separate cronjobs</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  Use cron-job.org&apos;s Create cronjob form. Do not leave the default 15-minute schedule for sending jobs.
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
                <p className="text-xs font-semibold text-[var(--foreground)] mb-2">Form settings for each job</p>
                <div className="space-y-2 text-xs text-[var(--muted)]">
                  <p><span className="text-[var(--foreground)]">URL:</span> paste the full job URL from below.</p>
                  <p><span className="text-[var(--foreground)]">Enable job:</span> on.</p>
                  <p><span className="text-[var(--foreground)]">Save responses:</span> on while testing, optional later.</p>
                  <p><span className="text-[var(--foreground)]">Execution schedule:</span> choose Custom.</p>
                  <p><span className="text-[var(--foreground)]">Timezone:</span> your account timezone is fine.</p>
                  <p><span className="text-[var(--foreground)]">Notify me:</span> enable failure notifications.</p>
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-xs font-semibold text-[var(--foreground)] mb-2">Request settings for each job</p>
                <div className="space-y-2 text-xs text-[var(--muted)]">
                  <p><span className="text-[var(--foreground)]">Method:</span> GET.</p>
                  <p><span className="text-[var(--foreground)]">Body:</span> empty.</p>
                  <p><span className="text-[var(--foreground)]">HTTP header name:</span> Authorization.</p>
                  <p><span className="text-[var(--foreground)]">HTTP header value:</span></p>
                  <code className="block overflow-x-auto rounded bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--accent)]">
                    Bearer your_cron_secret_token
                  </code>
                  <p>Use the exact same value as your Vercel <code className="bg-[var(--surface-2)] px-1 rounded">CRON_SECRET</code>.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[var(--foreground)]">Create these jobs</p>
              {CRON_JOBS.map(({ title, path, freq, cron, desc }) => (
                <div key={path} className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-[var(--foreground)]">{title}</p>
                      <code className="block text-xs font-mono text-[var(--accent)] break-all">{appUrl}{path}</code>
                      <p className="text-xs text-[var(--muted)]">{desc}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Badge variant="muted">{freq}</Badge>
                      <code className="rounded bg-[var(--surface)] px-2 py-1 text-xs text-[var(--foreground)]">{cron}</code>
                    </div>
                  </div>
                </div>
              ))}
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
              Configure these URLs in cron-job.org as GET requests with the custom header{" "}
              <code className="bg-[var(--surface-2)] px-1 rounded">Authorization: Bearer CRON_SECRET</code>.
            </p>
            {[
              ...CRON_JOBS,
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
