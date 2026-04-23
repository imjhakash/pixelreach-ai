"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Copy, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api-fetch";
import {
  DEFAULT_BODY_PROMPT,
  DEFAULT_SUBJECT_PROMPT,
  PROMPT_VARIABLES,
} from "@/lib/prompt-studio";

const CHIP_STYLES = [
  "border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:border-cyan-300/60 hover:bg-cyan-400/15",
  "border-emerald-400/30 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300/60 hover:bg-emerald-400/15",
  "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:border-amber-300/60 hover:bg-amber-400/15",
  "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200 hover:border-fuchsia-300/60 hover:bg-fuchsia-400/15",
  "border-rose-400/30 bg-rose-500/10 text-rose-200 hover:border-rose-300/60 hover:bg-rose-400/15",
  "border-violet-400/30 bg-violet-500/10 text-violet-200 hover:border-violet-300/60 hover:bg-violet-400/15",
] as const;

export function PromptStudioClient({
  initialPrompts,
}: {
  initialPrompts: { subjectPrompt: string; bodyPrompt: string };
}) {
  const [subjectPrompt, setSubjectPrompt] = useState(initialPrompts.subjectPrompt);
  const [bodyPrompt, setBodyPrompt] = useState(initialPrompts.bodyPrompt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [activeField, setActiveField] = useState<"subject" | "body">("body");
  const subjectRef = useRef<HTMLTextAreaElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function insertVariable(token: string) {
    const targetRef = activeField === "subject" ? subjectRef : bodyRef;
    const textarea = targetRef.current;

    if (!textarea) {
      navigator.clipboard.writeText(token);
      return;
    }

    const selectionStart = textarea.selectionStart ?? textarea.value.length;
    const selectionEnd = textarea.selectionEnd ?? textarea.value.length;
    const currentValue = activeField === "subject" ? subjectPrompt : bodyPrompt;
    const nextValue =
      currentValue.slice(0, selectionStart) + token + currentValue.slice(selectionEnd);

    if (activeField === "subject") {
      setSubjectPrompt(nextValue);
    } else {
      setBodyPrompt(nextValue);
    }

    requestAnimationFrame(() => {
      textarea.focus();
      const cursor = selectionStart + token.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError("");

    const res = await apiFetch("/api/prompt-studio", {
      method: "PUT",
      body: JSON.stringify({
        subject_prompt: subjectPrompt,
        body_prompt: bodyPrompt,
      }),
    });

    const data = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setSaveError(data?.error ?? "Failed to save Prompt Studio");
      return;
    }

    setSubjectPrompt(data?.settings?.subject_prompt ?? subjectPrompt);
    setBodyPrompt(data?.settings?.body_prompt ?? bodyPrompt);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
            <CardTitle>Default Email Prompt Templates</CardTitle>
          </div>
          <CardDescription>
            These defaults are loaded into new campaigns and used for AI test sends from your lead lists.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject Prompt</Label>
            <Textarea
              ref={subjectRef}
              className="min-h-[100px]"
              value={subjectPrompt}
              onFocus={() => setActiveField("subject")}
              onChange={(event) => setSubjectPrompt(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Body Prompt</Label>
            <Textarea
              ref={bodyRef}
              className="min-h-[220px]"
              value={bodyPrompt}
              onFocus={() => setActiveField("body")}
              onChange={(event) => setBodyPrompt(event.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setSubjectPrompt(DEFAULT_SUBJECT_PROMPT);
                setBodyPrompt(DEFAULT_BODY_PROMPT);
                setSaveError("");
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !subjectPrompt.trim() || !bodyPrompt.trim()}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Save Prompt Studio
            </Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm text-[var(--success)]">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}
          </div>

          {saveError && (
            <div className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
              {saveError}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Variables</CardTitle>
          <CardDescription>
            Click a variable to insert it into the active prompt field. If no field is focused, it will copy to your clipboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2.5">
            {PROMPT_VARIABLES.map((variable, index) => (
              <button
                key={variable.token}
                type="button"
                onClick={() => insertVariable(variable.token)}
                className={`group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all ${CHIP_STYLES[index % CHIP_STYLES.length]}`}
                title={variable.description}
              >
                <span>{variable.token}</span>
                <Copy className="h-3.5 w-3.5 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {PROMPT_VARIABLES.map((variable, index) => (
              <div
                key={`${variable.token}-description`}
                className={`rounded-2xl border px-3 py-3 ${CHIP_STYLES[index % CHIP_STYLES.length]}`}
              >
                <p className="text-sm font-semibold">{variable.token}</p>
                <p className="mt-1 text-xs opacity-85">{variable.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)]">
            Any custom field you import or add to a lead is also available as a variable. For example, a custom field named
            <code className="mx-1 rounded bg-[var(--surface)] px-1.5 py-0.5 text-[var(--foreground)]">industry_focus</code>
            can be used as
            <code className="ml-1 rounded bg-[var(--surface)] px-1.5 py-0.5 text-[var(--foreground)]">{"{{industry_focus}}"}</code>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
