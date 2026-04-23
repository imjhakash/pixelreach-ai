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

export function PromptStudioClient({
  initialPrompts,
}: {
  initialPrompts: { subjectPrompt: string; bodyPrompt: string };
}) {
  const [subjectPrompt, setSubjectPrompt] = useState(initialPrompts.subjectPrompt);
  const [bodyPrompt, setBodyPrompt] = useState(initialPrompts.bodyPrompt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
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

    const res = await apiFetch("/api/prompt-studio", {
      method: "PUT",
      body: JSON.stringify({
        subject_prompt: subjectPrompt,
        body_prompt: bodyPrompt,
      }),
    });

    setSaving(false);
    if (!res.ok) return;

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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Variables</CardTitle>
          <CardDescription>
            Click a variable to insert it into the active prompt field. If no field is focused, it will copy to your clipboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {PROMPT_VARIABLES.map((variable) => (
              <button
                key={variable.token}
                type="button"
                onClick={() => insertVariable(variable.token)}
                className="flex items-start justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3 text-left transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/5"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{variable.token}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{variable.description}</p>
                </div>
                <Copy className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
              </button>
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
