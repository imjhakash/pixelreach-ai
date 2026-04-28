"use client";

import { useState } from "react";
import {
  Send, Plus, Play, Pause, Trash2, ChevronRight,
  Loader2, MailOpen, MousePointerClick, AlertTriangle,
  Zap, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { apiFetch } from "@/lib/api-fetch";

interface Campaign {
  id: string;
  name: string;
  status: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  bounce_count: number;
  created_at: string;
  sender_profiles?: { company_name: string } | null;
  lead_lists?: { name: string } | null;
}

interface FollowUpDraft {
  step: number;
  delay_days: number;
  subject_prompt: string;
  body_prompt: string;
}

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "muted"> = {
  active: "success",
  paused: "warning",
  draft: "muted",
  completed: "default",
};

export function CampaignsClient({
  initialCampaigns,
  profiles,
  lists,
  promptDefaults,
}: {
  initialCampaigns: Campaign[];
  profiles: { id: string; company_name: string }[];
  lists: { id: string; name: string; total_leads: number }[];
  promptDefaults: { subjectPrompt: string; bodyPrompt: string };
}) {
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [profileId, setProfileId] = useState("");
  const [listId, setListId] = useState("");
  const [subjectPrompt, setSubjectPrompt] = useState(promptDefaults.subjectPrompt);
  const [bodyPrompt, setBodyPrompt] = useState(promptDefaults.bodyPrompt);
  const [followUps, setFollowUps] = useState<FollowUpDraft[]>([]);

  function resetForm() {
    setName("");
    setProfileId("");
    setListId("");
    setSubjectPrompt(promptDefaults.subjectPrompt);
    setBodyPrompt(promptDefaults.bodyPrompt);
    setFollowUps([]);
  }

  function openCreateDialog() {
    resetForm();
    setShowCreate(true);
  }

  function addFollowUp() {
    setFollowUps((prev) => [
      ...prev,
      {
        step: prev.length + 2,
        delay_days: 3,
        subject_prompt: "",
        body_prompt: "",
      },
    ]);
  }

  function updateFollowUp(index: number, field: keyof FollowUpDraft, value: string | number) {
    setFollowUps((prev) => prev.map((fu, i) => (i === index ? { ...fu, [field]: value } : fu)));
  }

  function removeFollowUp(index: number) {
    setFollowUps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    if (!name || !profileId || !listId || !subjectPrompt || !bodyPrompt) return;
    setSaving(true);

    const res = await apiFetch("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ name, profileId, listId, subjectPrompt, bodyPrompt, followUps }),
    });

    if (res.ok) {
      const { campaign } = await res.json();
      setCampaigns((prev) => [campaign, ...prev]);
      setShowCreate(false);
      resetForm();
    } else {
      const { error } = await res.json().catch(() => ({ error: "Failed to create campaign" }));
      alert(error);
    }
    setSaving(false);
  }

  async function toggleStatus(id: string, current: string) {
    const newStatus = current === "active" ? "paused" : "active";
    const res = await apiFetch(`/api/campaigns/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "Failed to update campaign" }));
      alert(error);
      return;
    }
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c));
  }

  async function deleteCampaign(id: string) {
    await apiFetch(`/api/campaigns/${id}`, { method: "DELETE" });
    setCampaigns((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{campaigns.length} campaigns</p>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div
          onClick={openCreateDialog}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] py-20 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors group"
        >
          <Send className="h-10 w-10 text-[var(--muted)] group-hover:text-[var(--accent)] mb-3 transition-colors" />
          <p className="text-sm font-medium text-[var(--foreground)]">Create your first campaign</p>
          <p className="text-xs text-[var(--muted)] mt-1">AI writes every email — personalized per lead</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="group hover:border-[var(--accent)]/40 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                      <Send className="h-5 w-5 text-[var(--accent)]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-[var(--foreground)] truncate">{c.name}</h3>
                        <Badge variant={STATUS_VARIANT[c.status] ?? "muted"}>{c.status}</Badge>
                      </div>
                      <p className="text-xs text-[var(--muted)] mt-0.5">
                        {c.sender_profiles?.company_name ?? "—"} · {c.lead_lists?.name ?? "—"} ·{" "}
                        {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 ml-4">
                    {/* Stats */}
                    <div className="hidden lg:flex items-center gap-5 text-xs text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Send className="h-3.5 w-3.5" />{c.sent_count}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--success)]">
                        <MailOpen className="h-3.5 w-3.5" />{c.open_count}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--warning)]">
                        <MousePointerClick className="h-3.5 w-3.5" />{c.click_count}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--danger)]">
                        <AlertTriangle className="h-3.5 w-3.5" />{c.bounce_count}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {c.status !== "completed" && (
                        <Button
                          variant="secondary" size="sm"
                          onClick={() => toggleStatus(c.id, c.status)}
                        >
                          {c.status === "active" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          {c.status === "active" ? "Pause" : "Start"}
                        </Button>
                      )}
                      <Link href={`/campaigns/${c.id}`}>
                        <Button variant="ghost" size="icon">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => deleteCampaign(c.id)}
                        className="text-[var(--muted)] hover:text-[var(--danger)]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Campaign Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Campaign</DialogTitle>
            <DialogDescription>
              Set up your campaign. AI will write a unique personalized email for every lead.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="setup" className="mt-2">
            <TabsList>
              <TabsTrigger value="setup">Setup</TabsTrigger>
              <TabsTrigger value="email">Email Prompts</TabsTrigger>
              <TabsTrigger value="followups">Follow-ups ({followUps.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="setup" className="space-y-4">
              <div className="space-y-1.5">
                <Label>Campaign Name</Label>
                <Input
                  placeholder="e.g. Dutch Roofers Q2 Outreach"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Sender Profile</Label>
                <Select value={profileId} onValueChange={setProfileId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sender profile..." />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {profiles.length === 0 && (
                  <p className="text-xs text-[var(--warning)]">
                    No profiles yet — <Link href="/profiles" className="underline">create one first</Link>
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Lead List</Label>
                <Select value={listId} onValueChange={setListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead list..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name} ({l.total_leads} leads)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="email" className="space-y-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-4 text-xs text-[var(--muted)]">
                <p className="font-semibold text-[var(--foreground)] mb-1 flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[var(--accent)]" /> How AI uses your prompt
                </p>
                The AI will receive the lead&apos;s full profile (name, company, location, job title, LinkedIn, etc.)
                alongside your prompt. Every email will be unique and hyper-personalized. Use placeholders like
                <code className="bg-[var(--surface)] px-1 rounded mx-0.5">{"{{lead_name}}"}</code>,
                <code className="bg-[var(--surface)] px-1 rounded mx-0.5">{"{{company}}"}</code> as hints in your prompt.
                Default prompts come from <Link href="/prompt-studio" className="text-[var(--accent)] underline underline-offset-2">Prompt Studio</Link>.
              </div>

              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSubjectPrompt(promptDefaults.subjectPrompt);
                    setBodyPrompt(promptDefaults.bodyPrompt);
                  }}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Use Prompt Studio Defaults
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label>Subject Line Prompt</Label>
                <Textarea
                  placeholder="Write a compelling subject line for a cold email to {{lead_name}} at {{company}}. Keep it short, curiosity-driven, no spam words."
                  className="min-h-[80px]"
                  value={subjectPrompt}
                  onChange={(e) => setSubjectPrompt(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Email Body Prompt</Label>
                <Textarea
                  placeholder="Write a short (150-200 word) personalized cold email introducing our web design services to {{lead_name}} who works at {{company}} in {{location}}. Mention something specific about their industry. Include a soft CTA to schedule a 15-min call. No pushy sales language."
                  className="min-h-[140px]"
                  value={bodyPrompt}
                  onChange={(e) => setBodyPrompt(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="followups" className="space-y-4">
              <p className="text-sm text-[var(--muted)]">
                Follow-ups are sent automatically if a lead hasn&apos;t replied after the specified delay.
              </p>

              {followUps.map((fu, i) => (
                <div key={i} className="rounded-lg border border-[var(--border)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      Follow-up #{i + 1} <span className="text-[var(--muted)]">(Step {fu.step})</span>
                    </p>
                    <button
                      onClick={() => removeFollowUp(i)}
                      className="text-[var(--muted)] hover:text-[var(--danger)] transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[var(--muted)] shrink-0" />
                    <Label className="text-[var(--muted)] whitespace-nowrap">Send after</Label>
                    <Input
                      type="number" min={1} max={30}
                      className="w-20"
                      value={fu.delay_days}
                      onChange={(e) => updateFollowUp(i, "delay_days", parseInt(e.target.value))}
                    />
                    <Label className="text-[var(--muted)]">days</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Subject Prompt</Label>
                    <Input
                      placeholder="Follow-up subject prompt..."
                      value={fu.subject_prompt}
                      onChange={(e) => updateFollowUp(i, "subject_prompt", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Body Prompt</Label>
                    <Textarea
                      placeholder="Follow-up body prompt..."
                      className="min-h-[80px]"
                      value={fu.body_prompt}
                      onChange={(e) => updateFollowUp(i, "body_prompt", e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button variant="secondary" onClick={addFollowUp} className="w-full">
                <Plus className="h-4 w-4" />
                Add Follow-up Step
              </Button>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="secondary" onClick={() => { setShowCreate(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !name || !profileId || !listId || !subjectPrompt || !bodyPrompt}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Create Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
