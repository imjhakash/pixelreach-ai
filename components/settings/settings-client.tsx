"use client";

import { useState } from "react";
import {
  CheckCircle, XCircle, Loader2, RefreshCw, Database,
  Zap, Mail, Server, Globe, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "idle" | "testing" | "ok" | "fail";

interface ServiceCheck {
  name: string;
  description: string;
  icon: React.ElementType;
  key: string;
}

const SERVICES: ServiceCheck[] = [
  { key: "supabase", name: "Supabase Database", description: "Postgres connection + RLS policies", icon: Database },
  { key: "runtime", name: "Netlify Runtime", description: "Serverless function execution", icon: Server },
];

export function SettingsClient({ userEmail }: { userEmail: string }) {
  const [checks, setChecks] = useState<Record<string, { status: Status; latency?: number; error?: string }>>({});
  const [runningAll, setRunningAll] = useState(false);

  // SMTP test
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpStatus, setSmtpStatus] = useState<Status>("idle");
  const [smtpError, setSmtpError] = useState("");

  // OpenRouter test
  const [orKey, setOrKey] = useState("");
  const [orStatus, setOrStatus] = useState<Status>("idle");
  const [orError, setOrError] = useState("");

  async function runAllChecks() {
    setRunningAll(true);
    setChecks((prev) => Object.fromEntries(SERVICES.map((s) => [s.key, { status: "testing" as Status }])));

    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      if (data.checks) {
        setChecks(
          Object.fromEntries(
            Object.entries(data.checks).map(([k, v]) => [
              k,
              { status: (v as { ok: boolean }).ok ? "ok" : "fail", latency: (v as { latencyMs?: number }).latencyMs, error: (v as { error?: string }).error },
            ])
          )
        );
      }
    } catch {
      setChecks(Object.fromEntries(SERVICES.map((s) => [s.key, { status: "fail" as Status, error: "Network error" }])));
    }
    setRunningAll(false);
  }

  async function testSmtp() {
    if (!smtpHost || !smtpUser || !smtpPass) return;
    setSmtpStatus("testing");
    setSmtpError("");
    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "smtp", config: { smtp_host: smtpHost, smtp_port: smtpPort, smtp_user: smtpUser, smtp_pass: smtpPass } }),
      });
      const data = await res.json();
      setSmtpStatus(data.ok ? "ok" : "fail");
      setSmtpError(data.error ?? "");
    } catch (e) {
      setSmtpStatus("fail");
      setSmtpError(String(e));
    }
  }

  async function testOpenRouter() {
    if (!orKey) return;
    setOrStatus("testing");
    setOrError("");
    try {
      const res = await fetch("/api/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "openrouter", config: { api_key: orKey } }),
      });
      const data = await res.json();
      setOrStatus(data.ok ? "ok" : "fail");
      setOrError(data.error ?? "");
    } catch (e) {
      setOrStatus("fail");
      setOrError(String(e));
    }
  }

  const StatusIcon = ({ status }: { status: Status }) => {
    if (status === "testing") return <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />;
    if (status === "ok") return <CheckCircle className="h-4 w-4 text-[var(--success)]" />;
    if (status === "fail") return <XCircle className="h-4 w-4 text-[var(--danger)]" />;
    return <div className="h-4 w-4 rounded-full border-2 border-[var(--border)]" />;
  };

  return (
    <div className="space-y-5">
      {/* System Health Check */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>System Connection Tests</CardTitle>
            </div>
            <Button variant="secondary" size="sm" onClick={runAllChecks} disabled={runningAll}>
              {runningAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Run All Tests
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {SERVICES.map(({ key, name, description, icon: Icon }) => {
            const check = checks[key];
            return (
              <div key={key} className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                    <Icon className="h-4 w-4 text-[var(--accent)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{name}</p>
                    <p className="text-xs text-[var(--muted)]">{description}</p>
                    {check?.error && <p className="text-xs text-[var(--danger)] mt-0.5">{check.error}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {check?.latency != null && check.status === "ok" && (
                    <span className="text-xs text-[var(--muted)]">{check.latency}ms</span>
                  )}
                  <StatusIcon status={check?.status ?? "idle"} />
                </div>
              </div>
            );
          })}

          {/* App URL */}
          <div className="flex items-center justify-between py-2.5 border-b border-[var(--border)] last:border-0">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                <Globe className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">App URL</p>
                <p className="text-xs text-[var(--muted)] font-mono">{process.env.NEXT_PUBLIC_APP_URL ?? "Not set"}</p>
              </div>
            </div>
            <CheckCircle className="h-4 w-4 text-[var(--success)]" />
          </div>

          {/* Logged in user */}
          <div className="flex items-center justify-between py-2.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)]">
                <Zap className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Auth Session</p>
                <p className="text-xs text-[var(--muted)]">{userEmail}</p>
              </div>
            </div>
            <CheckCircle className="h-4 w-4 text-[var(--success)]" />
          </div>
        </CardContent>
      </Card>

      {/* SMTP Test */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[var(--accent)]" />
            <CardTitle>Test SMTP Connection</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label>SMTP Host</Label>
              <Input placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input placeholder="587" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Username</Label>
              <Input placeholder="your@email.com" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Password / App Password</Label>
              <Input type="password" placeholder="••••••••" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary" size="sm"
              onClick={testSmtp}
              disabled={smtpStatus === "testing" || !smtpHost || !smtpUser || !smtpPass}
            >
              {smtpStatus === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Test SMTP
            </Button>
            {smtpStatus === "ok" && <span className="flex items-center gap-1 text-sm text-[var(--success)]"><CheckCircle className="h-4 w-4" /> Connected successfully</span>}
            {smtpStatus === "fail" && <span className="flex items-center gap-1 text-sm text-[var(--danger)]"><XCircle className="h-4 w-4" /> {smtpError || "Connection failed"}</span>}
          </div>
        </CardContent>
      </Card>

      {/* OpenRouter Test */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[var(--accent)]" />
            <CardTitle>Test OpenRouter API Key</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>OpenRouter API Key</Label>
            <Input
              type="password"
              placeholder="sk-or-v1-••••••••••••••••"
              value={orKey}
              onChange={(e) => setOrKey(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary" size="sm"
              onClick={testOpenRouter}
              disabled={orStatus === "testing" || !orKey}
            >
              {orStatus === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Test Key
            </Button>
            {orStatus === "ok" && <span className="flex items-center gap-1 text-sm text-[var(--success)]"><CheckCircle className="h-4 w-4" /> API key is valid</span>}
            {orStatus === "fail" && <span className="flex items-center gap-1 text-sm text-[var(--danger)]"><XCircle className="h-4 w-4" /> {orError || "Invalid key"}</span>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
