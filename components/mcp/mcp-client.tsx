"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  Plug,
  Plus,
  Trash2,
  TriangleAlert,
} from "lucide-react";

type TokenRow = {
  id: string;
  label: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
};

export function McpClient({ baseUrl }: { baseUrl: string }) {
  const supabase = createClient();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [reveal, setReveal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const mcpUrl = `${baseUrl}/api/mcp`;

  async function authedFetch(path: string, init?: RequestInit) {
    const { data: { session } } = await supabase.auth.getSession();
    return fetch(path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
    });
  }

  async function loadTokens() {
    try {
      const res = await authedFetch("/api/mcp-tokens");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load tokens");
      setTokens(json.tokens ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tokens");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void (async () => {
      await loadTokens();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createToken() {
    if (!label.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await authedFetch("/api/mcp-tokens", {
        method: "POST",
        body: JSON.stringify({ label: label.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create token");
      setReveal(json.token);
      setLabel("");
      await loadTokens();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create token");
    } finally {
      setCreating(false);
    }
  }

  async function revokeToken(id: string) {
    if (!confirm("Revoke this token? Any clients using it will lose access immediately.")) return;
    try {
      const res = await authedFetch(`/api/mcp-tokens/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to revoke");
      }
      await loadTokens();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke");
    }
  }

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const claudeConfig = JSON.stringify(
    {
      mcpServers: {
        pixelreach: {
          command: "npx",
          args: [
            "-y",
            "mcp-remote@latest",
            mcpUrl,
            "--header",
            "Authorization: Bearer ${PIXELREACH_TOKEN}",
          ],
          env: {
            PIXELREACH_TOKEN: reveal ?? "<paste your token here>",
          },
        },
      },
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        pixelreach: {
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${reveal ?? "<paste your token here>"}`,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* What is this */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-[var(--accent)]" />
            <CardTitle>Connect to Claude Desktop & other MCP clients</CardTitle>
          </div>
          <CardDescription>
            Generate an API token below, then paste the snippet into your MCP client&apos;s
            config to give it access to your leads, campaigns, sender profiles and email tools.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Token reveal banner */}
      {reveal && (
        <Card className="border-[var(--accent)]/40 bg-[var(--accent)]/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>New token — copy it now</CardTitle>
            </div>
            <CardDescription>
              This is the only time you&apos;ll see the full token. Store it somewhere safe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs">
                {reveal}
              </code>
              <Button size="sm" variant="secondary" onClick={() => copy(reveal, "token")}>
                {copied === "token" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied === "token" ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setReveal(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tokens management */}
      <Card>
        <CardHeader>
          <CardTitle>API tokens</CardTitle>
          <CardDescription>One token per device or client. Revoke any time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Label htmlFor="token-label">New token label</Label>
              <Input
                id="token-label"
                placeholder="My Claude Desktop"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void createToken();
                }}
              />
            </div>
            <Button onClick={createToken} disabled={creating || !label.trim()}>
              {creating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Plus className="h-3 w-3" />
              )}
              Generate
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              <TriangleAlert className="h-3 w-3" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-[var(--muted)]">Loading…</p>
            ) : tokens.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No tokens yet. Generate one above.</p>
            ) : (
              tokens.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--foreground)]">
                      {t.label}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted)]">
                      <code className="font-mono">{t.token_prefix}…</code>
                      <span>·</span>
                      <span>
                        {t.last_used_at
                          ? `last used ${new Date(t.last_used_at).toLocaleString()}`
                          : "never used"}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => revokeToken(t.id)}
                    aria-label="Revoke token"
                  >
                    <Trash2 className="h-3 w-3 text-[var(--danger)]" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Endpoint */}
      <Card>
        <CardHeader>
          <CardTitle>MCP endpoint</CardTitle>
          <CardDescription>Streamable HTTP — point any MCP-compatible client here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 font-mono text-xs">
              {mcpUrl}
            </code>
            <Button size="sm" variant="secondary" onClick={() => copy(mcpUrl, "url")}>
              {copied === "url" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied === "url" ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Claude Desktop snippet */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Claude Desktop config</CardTitle>
            <Badge variant="muted">claude_desktop_config.json</Badge>
          </div>
          <CardDescription>
            Open Claude Desktop → Settings → Developer → Edit Config and merge this in.
            Claude Desktop doesn&apos;t natively send headers to HTTP MCP servers, so we route
            through <code className="font-mono">mcp-remote</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigBlock json={claudeConfig} onCopy={() => copy(claudeConfig, "claude")} copied={copied === "claude"} />
        </CardContent>
      </Card>

      {/* Cursor / native HTTP snippet */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Cursor / native HTTP MCP clients</CardTitle>
            <Badge variant="muted">.cursor/mcp.json</Badge>
          </div>
          <CardDescription>
            For clients that support native HTTP transport with custom headers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfigBlock json={cursorConfig} onCopy={() => copy(cursorConfig, "cursor")} copied={copied === "cursor"} />
        </CardContent>
      </Card>

      {/* Tools list */}
      <Card>
        <CardHeader>
          <CardTitle>Available tools</CardTitle>
          <CardDescription>
            Once connected, your MCP client can call any of these against your data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {TOOL_LIST.map((t) => (
              <div
                key={t}
                className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
              >
                <code className="font-mono text-xs text-[var(--foreground)]">{t}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigBlock({
  json,
  onCopy,
  copied,
}: {
  json: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs">
        <code>{json}</code>
      </pre>
      <Button
        size="sm"
        variant="secondary"
        className="absolute right-2 top-2"
        onClick={onCopy}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

const TOOL_LIST = [
  "list_lead_lists",
  "get_lead_list",
  "create_lead_list",
  "delete_lead_list",
  "search_leads",
  "get_lead",
  "create_lead",
  "update_lead",
  "delete_lead",
  "list_sender_profiles",
  "get_sender_profile",
  "create_sender_profile",
  "delete_sender_profile",
  "list_email_accounts",
  "add_email_account",
  "delete_email_account",
  "list_campaigns",
  "get_campaign",
  "create_campaign",
  "set_campaign_status",
  "delete_campaign",
  "get_campaign_stats",
  "list_email_sends",
  "send_email",
  "get_dashboard_stats",
  "get_prompt_studio_settings",
];
