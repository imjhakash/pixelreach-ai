"use client";

import { useState } from "react";
import {
  Building2, Plus, Mail, Server, Zap, Eye, EyeOff,
  Loader2, Trash2, RotateCcw, Settings, ExternalLink,
  Check, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import type { SenderProfile, EmailAccount } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";

interface ProfilesClientProps {
  initialProfiles: SenderProfile[];
  initialAccounts: EmailAccount[];
  userId: string;
}

export function ProfilesClient({ initialProfiles, initialAccounts, userId }: ProfilesClientProps) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    initialProfiles[0]?.id ?? null
  );
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<"ok" | "fail" | null>(null);
  const [showPass, setShowPass] = useState(false);

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const profileAccounts = accounts.filter((a) => a.sender_profile_id === selectedProfileId);

  // Profile form state
  const [pf, setPf] = useState({
    company_name: "", company_address: "", services: "",
    portfolio_url: "", details: "", from_name: "", reply_to: "",
    daily_limit: 50, delay_seconds: 60,
    openrouter_api_key: "", openrouter_model: "anthropic/claude-sonnet-4",
    openrouter_fallback_model: "openai/gpt-4o-mini",
    openrouter_temperature: 0.7, openrouter_max_tokens: 600,
  });

  // Account form state
  const [af, setAf] = useState({
    label: "", from_email: "",
    smtp_host: "", smtp_port: 587, smtp_user: "", smtp_pass: "",
    imap_host: "", imap_port: 993, imap_user: "", imap_pass: "",
    imap_enabled: false,
  });

  async function saveProfile() {
    setSaving(true);
    const res = await apiFetch("/api/profiles", {
      method: "POST",
      body: JSON.stringify(pf),
    });
    if (res.ok) {
      const { profile } = await res.json();
      setProfiles((prev) => [profile, ...prev]);
      setSelectedProfileId(profile.id);
      setShowProfileForm(false);
      setPf({
        company_name: "", company_address: "", services: "",
        portfolio_url: "", details: "", from_name: "", reply_to: "",
        daily_limit: 50, delay_seconds: 60,
        openrouter_api_key: "", openrouter_model: "anthropic/claude-sonnet-4",
        openrouter_fallback_model: "openai/gpt-4o-mini",
        openrouter_temperature: 0.7, openrouter_max_tokens: 600,
      });
    }
    setSaving(false);
  }

  async function saveAccount() {
    setSaving(true);
    const res = await apiFetch("/api/profiles/accounts", {
      method: "POST",
      body: JSON.stringify({ ...af, profileId: selectedProfileId }),
    });
    if (res.ok) {
      const { account } = await res.json();
      setAccounts((prev) => [...prev, account]);
      setShowAccountForm(false);
      setAf({
        label: "", from_email: "",
        smtp_host: "", smtp_port: 587, smtp_user: "", smtp_pass: "",
        imap_host: "", imap_port: 993, imap_user: "", imap_pass: "",
        imap_enabled: false,
      });
    }
    setSaving(false);
  }

  async function testSmtp() {
    setTestingSmtp(true);
    setSmtpTestResult(null);
    const res = await apiFetch("/api/profiles/test-smtp", {
      method: "POST",
      body: JSON.stringify({
        smtp_host: af.smtp_host, smtp_port: af.smtp_port,
        smtp_user: af.smtp_user, smtp_pass: af.smtp_pass,
        from_email: af.from_email,
      }),
    });
    setSmtpTestResult(res.ok ? "ok" : "fail");
    setTestingSmtp(false);
  }

  async function deleteAccount(id: string) {
    await apiFetch(`/api/profiles/accounts/${id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  async function toggleAccount(id: string, current: boolean) {
    await apiFetch(`/api/profiles/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ is_active: !current }),
    });
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !current } : a));
  }

  return (
    <div className="p-6 flex gap-5">
      {/* Left: Profile List */}
      <div className="w-64 shrink-0 space-y-2">
        {profiles.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedProfileId(p.id)}
            className={`w-full text-left rounded-lg border p-3.5 transition-all ${
              selectedProfileId === p.id
                ? "border-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Building2 className={`h-4 w-4 shrink-0 ${selectedProfileId === p.id ? "text-[var(--accent)]" : "text-[var(--muted)]"}`} />
              <p className="text-sm font-medium text-[var(--foreground)] truncate">{p.company_name}</p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {accounts.filter((a) => a.sender_profile_id === p.id).length} email accounts
            </p>
          </button>
        ))}

        <button
          onClick={() => setShowProfileForm(true)}
          className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] p-3.5 text-sm text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Profile
        </button>
      </div>

      {/* Right: Profile Detail */}
      <div className="flex-1 min-w-0">
        {!selectedProfile ? (
          <div className="flex flex-col items-center justify-center h-64 text-[var(--muted)]">
            <Building2 className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">Select or create a sender profile</p>
          </div>
        ) : (
          <Tabs defaultValue="info">
            <TabsList>
              <TabsTrigger value="info">Company Info</TabsTrigger>
              <TabsTrigger value="emails">
                Email Accounts ({profileAccounts.length})
              </TabsTrigger>
              <TabsTrigger value="ai">AI Config</TabsTrigger>
              <TabsTrigger value="sending">Sending Rules</TabsTrigger>
            </TabsList>

            {/* Company Info */}
            <TabsContent value="info">
              <Card>
                <CardContent className="p-5 space-y-3">
                  {[
                    { label: "Company Name", value: selectedProfile.company_name },
                    { label: "From Name", value: selectedProfile.from_name },
                    { label: "Reply-To", value: selectedProfile.reply_to },
                    { label: "Address", value: selectedProfile.company_address },
                    { label: "Services", value: selectedProfile.services },
                    { label: "Portfolio", value: selectedProfile.portfolio_url },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="flex items-start gap-3">
                      <p className="text-xs text-[var(--muted)] w-24 shrink-0 pt-0.5">{label}</p>
                      <p className="text-sm text-[var(--foreground)]">{value}</p>
                    </div>
                  ) : null)}
                  {selectedProfile.details && (
                    <div className="flex items-start gap-3">
                      <p className="text-xs text-[var(--muted)] w-24 shrink-0 pt-0.5">Details</p>
                      <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{selectedProfile.details}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Email Accounts */}
            <TabsContent value="emails" className="space-y-3">
              {profileAccounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] py-12 text-[var(--muted)]">
                  <Mail className="h-8 w-8 mb-3 opacity-30" />
                  <p className="text-sm">No email accounts yet</p>
                </div>
              ) : (
                profileAccounts.map((acc, i) => (
                  <Card key={acc.id} className="group">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-xs font-bold text-[var(--muted)]">
                            #{i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">{acc.label}</p>
                            <p className="text-xs text-[var(--muted)]">{acc.from_email}</p>
                          </div>
                          <Badge variant={acc.is_active ? "success" : "muted"}>
                            {acc.is_active ? "active" : "paused"}
                          </Badge>
                          {acc.imap_enabled && (
                            <Badge variant="default">IMAP</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={acc.is_active}
                            onCheckedChange={() => toggleAccount(acc.id, acc.is_active)}
                          />
                          <button
                            onClick={() => deleteAccount(acc.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)] hover:text-[var(--danger)] p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-[var(--muted)]">
                        <span className="flex items-center gap-1">
                          <Server className="h-3 w-3" />
                          {acc.smtp_host}:{acc.smtp_port}
                        </span>
                        <span className="flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" />
                          {acc.daily_sent} sent today
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}

              <Button variant="secondary" onClick={() => setShowAccountForm(true)}>
                <Plus className="h-4 w-4" />
                Add Email Account
              </Button>
            </TabsContent>

            {/* AI Config */}
            <TabsContent value="ai">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[var(--accent)]" />
                    <CardTitle>OpenRouter AI Configuration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Model", value: selectedProfile.openrouter_model },
                    { label: "Fallback Model", value: selectedProfile.openrouter_fallback_model },
                    { label: "Temperature", value: String(selectedProfile.openrouter_temperature) },
                    { label: "Max Tokens", value: String(selectedProfile.openrouter_max_tokens) },
                    { label: "API Key", value: selectedProfile.openrouter_api_key_encrypted ? "••••••••••••" : "Not set" },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <p className="text-xs text-[var(--muted)] w-32 shrink-0">{label}</p>
                      <p className="text-sm text-[var(--foreground)] font-mono">{value}</p>
                    </div>
                  ))}
                  <a
                    href="https://openrouter.ai/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline mt-2"
                  >
                    Browse OpenRouter models
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sending Rules */}
            <TabsContent value="sending">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-[var(--accent)]" />
                    <CardTitle>Sending Rules</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-[var(--muted)] w-36 shrink-0">Daily Send Limit</p>
                    <p className="text-sm text-[var(--foreground)] font-semibold">{selectedProfile.daily_limit} emails/day</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-[var(--muted)] w-36 shrink-0">Delay Between Sends</p>
                    <p className="text-sm text-[var(--foreground)] font-semibold">{selectedProfile.delay_seconds}s</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-[var(--muted)] w-36 shrink-0">Email Rotation</p>
                    <p className="text-sm text-[var(--foreground)]">
                      {profileAccounts.length > 1 ? `${profileAccounts.length} accounts rotating` : "Single account"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Create Profile Dialog */}
      <Dialog open={showProfileForm} onOpenChange={setShowProfileForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Sender Profile</DialogTitle>
            <DialogDescription>Set up your company identity and AI email generation settings.</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="company">
            <TabsList>
              <TabsTrigger value="company">Company</TabsTrigger>
              <TabsTrigger value="ai">AI & Sending</TabsTrigger>
            </TabsList>

            <TabsContent value="company" className="space-y-4 mt-4">
              {[
                { id: "company_name", label: "Company Name *", placeholder: "CodeMyPixel", key: "company_name" as const },
                { id: "from_name", label: "From Name *", placeholder: "Akash from CodeMyPixel", key: "from_name" as const },
                { id: "reply_to", label: "Reply-To Email", placeholder: "reply@codemypixel.com", key: "reply_to" as const },
                { id: "company_address", label: "Company Address", placeholder: "Amsterdam, Netherlands", key: "company_address" as const },
                { id: "portfolio_url", label: "Portfolio / Website URL", placeholder: "https://codemypixel.com", key: "portfolio_url" as const },
              ].map(({ id, label, placeholder, key }) => (
                <div key={id} className="space-y-1.5">
                  <Label htmlFor={id}>{label}</Label>
                  <Input
                    id={id}
                    placeholder={placeholder}
                    value={pf[key] as string}
                    onChange={(e) => setPf((prev) => ({ ...prev, [key]: e.target.value }))}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label>Services Provided</Label>
                <Textarea
                  placeholder="Web design, web development, SEO, branding..."
                  value={pf.services}
                  onChange={(e) => setPf((prev) => ({ ...prev, services: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Additional Details</Label>
                <Textarea
                  placeholder="Any extra context the AI should know about your company to write better emails..."
                  value={pf.details}
                  onChange={(e) => setPf((prev) => ({ ...prev, details: e.target.value }))}
                  className="min-h-[100px]"
                />
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <Label>OpenRouter API Key</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    placeholder="sk-or-v1-••••••••••••••••"
                    value={pf.openrouter_api_key}
                    onChange={(e) => setPf((prev) => ({ ...prev, openrouter_api_key: e.target.value }))}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:underline">
                  Get your API key <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Model</Label>
                  <Input
                    placeholder="anthropic/claude-sonnet-4"
                    value={pf.openrouter_model}
                    onChange={(e) => setPf((prev) => ({ ...prev, openrouter_model: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Fallback Model</Label>
                  <Input
                    placeholder="openai/gpt-4o-mini"
                    value={pf.openrouter_fallback_model}
                    onChange={(e) => setPf((prev) => ({ ...prev, openrouter_fallback_model: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Temperature</Label>
                  <Input
                    type="number" min={0} max={2} step={0.1}
                    value={pf.openrouter_temperature}
                    onChange={(e) => setPf((prev) => ({ ...prev, openrouter_temperature: parseFloat(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Tokens</Label>
                  <Input
                    type="number" min={100} max={4000}
                    value={pf.openrouter_max_tokens}
                    onChange={(e) => setPf((prev) => ({ ...prev, openrouter_max_tokens: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Daily Email Limit</Label>
                  <Input
                    type="number" min={1} max={500}
                    value={pf.daily_limit}
                    onChange={(e) => setPf((prev) => ({ ...prev, daily_limit: parseInt(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Delay Between Sends (seconds)</Label>
                  <Input
                    type="number" min={10} max={600}
                    value={pf.delay_seconds}
                    onChange={(e) => setPf((prev) => ({ ...prev, delay_seconds: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowProfileForm(false)}>Cancel</Button>
            <Button onClick={saveProfile} disabled={saving || !pf.company_name || !pf.from_name}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Email Account Dialog */}
      <Dialog open={showAccountForm} onOpenChange={setShowAccountForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Email Account</DialogTitle>
            <DialogDescription>SMTP credentials for sending emails. IMAP optional for bounce/reply detection.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Account Label</Label>
                <Input
                  placeholder="e.g. Main Outreach, Backup Gmail"
                  value={af.label}
                  onChange={(e) => setAf((prev) => ({ ...prev, label: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>From Email</Label>
                <Input
                  type="email"
                  placeholder="outreach@yourcompany.com"
                  value={af.from_email}
                  onChange={(e) => setAf((prev) => ({ ...prev, from_email: e.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
              <p className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
                <Server className="h-4 w-4 text-[var(--accent)]" /> SMTP Settings
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1.5 col-span-2">
                  <Label>SMTP Host</Label>
                  <Input
                    placeholder="smtp.gmail.com"
                    value={af.smtp_host}
                    onChange={(e) => setAf((prev) => ({ ...prev, smtp_host: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Port</Label>
                  <Input
                    type="number"
                    value={af.smtp_port}
                    onChange={(e) => setAf((prev) => ({ ...prev, smtp_port: parseInt(e.target.value) }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>Username</Label>
                  <Input
                    placeholder="your@email.com"
                    value={af.smtp_user}
                    onChange={(e) => setAf((prev) => ({ ...prev, smtp_user: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Password / App Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={af.smtp_pass}
                    onChange={(e) => setAf((prev) => ({ ...prev, smtp_pass: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary" size="sm"
                  onClick={testSmtp}
                  disabled={testingSmtp || !af.smtp_host || !af.smtp_user || !af.smtp_pass}
                >
                  {testingSmtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                  Test Connection
                </Button>
                {smtpTestResult === "ok" && (
                  <span className="flex items-center gap-1 text-xs text-[var(--success)]">
                    <Check className="h-3.5 w-3.5" /> Connected
                  </span>
                )}
                {smtpTestResult === "fail" && (
                  <span className="flex items-center gap-1 text-xs text-[var(--danger)]">
                    <X className="h-3.5 w-3.5" /> Failed
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-[var(--foreground)] flex items-center gap-2">
                  <Mail className="h-4 w-4 text-[var(--accent)]" /> IMAP Settings
                  <Badge variant="muted">Optional</Badge>
                </p>
                <div className="flex items-center gap-2">
                  <Label className="text-[var(--muted)] text-xs">Enable IMAP</Label>
                  <Switch
                    checked={af.imap_enabled}
                    onCheckedChange={(v) => setAf((prev) => ({ ...prev, imap_enabled: v }))}
                  />
                </div>
              </div>
              {af.imap_enabled && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1.5 col-span-2">
                    <Label>IMAP Host</Label>
                    <Input
                      placeholder="imap.gmail.com"
                      value={af.imap_host}
                      onChange={(e) => setAf((prev) => ({ ...prev, imap_host: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Port</Label>
                    <Input
                      type="number"
                      value={af.imap_port}
                      onChange={(e) => setAf((prev) => ({ ...prev, imap_port: parseInt(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>IMAP User</Label>
                    <Input
                      placeholder="your@email.com"
                      value={af.imap_user}
                      onChange={(e) => setAf((prev) => ({ ...prev, imap_user: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5 col-span-2">
                    <Label>IMAP Password</Label>
                    <Input
                      type="password"
                      placeholder="••••••••••••"
                      value={af.imap_pass}
                      onChange={(e) => setAf((prev) => ({ ...prev, imap_pass: e.target.value }))}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowAccountForm(false)}>Cancel</Button>
            <Button
              onClick={saveAccount}
              disabled={saving || !af.label || !af.from_email || !af.smtp_host || !af.smtp_user || !af.smtp_pass}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
