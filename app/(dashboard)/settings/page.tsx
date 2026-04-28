import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Zap, ExternalLink, ShieldCheck, AlertCircle } from "lucide-react";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app";
  const workerUrl = `${appUrl}/api/jobs/campaign-worker`;

  return (
    <div>
      <Header title="Settings" subtitle="System configuration and infrastructure info" />
      <div className="p-6 space-y-6">

        {/* Account */}
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
              <CardTitle>Infrastructure</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { service: "Next.js App", provider: "Vercel Hobby", detail: "Free · 100GB bandwidth/mo" },
                { service: "Database", provider: "Supabase Free", detail: "500MB Postgres + Auth + Storage" },
                { service: "AI Generation", provider: "OpenRouter", detail: "User's own API key — pay per use" },
                { service: "Email Sending", provider: "Nodemailer / SMTP", detail: "User's own Gmail/SMTP accounts" },
                { service: "Cron Scheduler", provider: "cron-job.org", detail: "Free · pings campaign-worker every minute" },
                { service: "Tracking Domain", provider: "Cloudflare", detail: "Open pixel + click redirect" },
              ].map(({ service, provider, detail }) => (
                <div key={service} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{service}</p>
                    <p className="text-xs text-[var(--muted)]">{provider} · {detail}</p>
                  </div>
                  <Badge variant="success">active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Flow Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>How the campaign flow works</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted)]">
            <ol className="list-decimal pl-5 space-y-2">
              <li>You start a campaign → it creates one <code className="bg-[var(--surface-2)] px-1 rounded">email_sends</code> row per lead in <strong>pending_gen</strong>, plus one queue row.</li>
              <li>cron-job.org pings <code className="bg-[var(--surface-2)] px-1 rounded">/api/jobs/campaign-worker</code> every minute.</li>
              <li>Each call: <strong>generates</strong> AI content for up to 3 emails in parallel, then <strong>sends</strong> up to 3 ready emails via SMTP, then schedules any due follow-ups.</li>
              <li>Open pixel + click links are added automatically; opens/clicks/replies/bounces flow back through tracking endpoints and IMAP ingest.</li>
            </ol>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p>If your cron-job.org job is paused or not configured, campaigns will look stuck. Use the <strong>Process Now</strong> button on a campaign to manually trigger a worker run (handles up to ~9 emails per click).</p>
            </div>
          </CardContent>
        </Card>

        {/* cron-job.org Setup */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>cron-job.org setup (the only step that runs your campaigns)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-[var(--foreground)]">
                Open cron-job.org, click <strong>Create cronjob</strong>, and fill in the fields below exactly.
              </p>
              <Button asChild variant="secondary" className="shrink-0">
                <a href="https://console.cron-job.org/jobs/create" target="_blank" rel="noreferrer">
                  Create cronjob
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">Title</p>
                <code className="block text-sm bg-[var(--surface-2)] px-3 py-2 rounded">PixelReach Campaign Worker</code>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">URL</p>
                <code className="block text-xs bg-[var(--surface-2)] px-3 py-2 rounded text-[var(--accent)] break-all font-mono">
                  {workerUrl}
                </code>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">Execution schedule</p>
                  <p className="text-sm">Custom → Crontab</p>
                  <code className="block text-sm bg-[var(--surface-2)] px-3 py-1.5 rounded mt-1">* * * * *</code>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">Timezone</p>
                  <p className="text-sm">Your account default (UTC works fine)</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
              <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Request → Advanced</p>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">Method</p>
                  <code className="block text-sm bg-[var(--surface-2)] px-3 py-1.5 rounded">GET</code>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">Body</p>
                  <code className="block text-sm bg-[var(--surface-2)] px-3 py-1.5 rounded text-[var(--muted)]">(leave empty)</code>
                </div>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Custom HTTP header — Name</p>
                <code className="block text-sm bg-[var(--surface-2)] px-3 py-1.5 rounded">Authorization</code>
              </div>

              <div>
                <p className="text-xs text-[var(--muted)] mb-1">Custom HTTP header — Value</p>
                <code className="block text-sm bg-[var(--surface-2)] px-3 py-1.5 rounded text-[var(--accent)]">
                  Bearer YOUR_CRON_SECRET
                </code>
                <p className="text-xs text-[var(--muted)] mt-2">
                  Replace <code className="bg-[var(--surface-2)] px-1 rounded">YOUR_CRON_SECRET</code> with the exact value of <code className="bg-[var(--surface-2)] px-1 rounded">CRON_SECRET</code> from your Vercel environment variables. The word <strong>Bearer</strong> + space + token is required.
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-[var(--muted)]">
              <p className="text-[var(--foreground)] font-medium mb-1">Verify it works</p>
              <p>After saving, click <strong>Test run</strong> on cron-job.org. You should see HTTP <strong>200</strong> with body like <code className="bg-[var(--surface-2)] px-1 rounded">{`{"generated":3,"sent":3,...}`}</code>. If you see <strong>401 Unauthorized</strong>, the Authorization header is wrong.</p>
            </div>
          </CardContent>
        </Card>

        {/* Endpoints reference */}
        <Card>
          <CardHeader>
            <CardTitle>API endpoints reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-center justify-between mb-1">
                <code className="text-xs font-mono text-[var(--accent)]">/api/jobs/campaign-worker</code>
                <Badge variant="muted">GET · cron-job.org</Badge>
              </div>
              <p className="text-xs text-[var(--muted)]">Single worker — generates + sends + schedules follow-ups (max 3 of each per call)</p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3">
              <div className="flex items-center justify-between mb-1">
                <code className="text-xs font-mono text-[var(--accent)]">/api/imap/ingest</code>
                <Badge variant="muted">POST · webhook</Badge>
              </div>
              <p className="text-xs text-[var(--muted)]">Receive bounce/reply data from your IMAP poller</p>
            </div>
          </CardContent>
        </Card>

        {/* Env vars */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>Environment Variables</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[var(--muted)] mb-3">
              Required in your <code className="bg-[var(--surface-2)] px-1 rounded">.env.local</code> (development) and Vercel Project → Environment Variables (production).
            </p>
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
