import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Database, Zap, Clock } from "lucide-react";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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
                { service: "Cron Jobs", provider: "Hostinger PHP", status: "active", detail: "Every 1 min send · Every 5 min IMAP" },
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
              Configure these URLs in your Hostinger cron scheduler. Requires{" "}
              <code className="bg-[var(--surface-2)] px-1 rounded">CRON_SECRET</code> header.
            </p>
            {[
              { path: "/api/jobs/generate-emails", freq: "Every 1 min", desc: "Pre-generate AI email bodies for pending sends" },
              { path: "/api/jobs/process-send-queue", freq: "Every 1 min", desc: "Send up to 10 queued emails via SMTP" },
              { path: "/api/jobs/process-followups", freq: "Every 5 min", desc: "Schedule follow-up emails that are due" },
              { path: "/api/imap/ingest", freq: "Called by PHP", desc: "Receive bounce/reply data from Hostinger IMAP poller" },
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
