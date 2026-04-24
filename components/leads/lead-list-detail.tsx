"use client";

import { useMemo, useState } from "react";
import {
  Mail, Phone, Building2, MapPin, ExternalLink, Globe,
  Search, X, ChevronDown, Tag, User, Briefcase, Link2,
  Copy, Check, Plus, Send, Loader2, Sparkles, FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmailAccount, Lead, LeadList, SenderProfile } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "muted"> = {
  new: "muted", emailed: "default", replied: "success",
  bounced: "danger", unsubscribed: "warning",
};

const ALL_COLUMNS = [
  { id: "name", label: "Name", icon: User },
  { id: "email", label: "Email", icon: Mail },
  { id: "company", label: "Company", icon: Building2 },
  { id: "phone", label: "Phone", icon: Phone },
  { id: "job_title", label: "Job Title", icon: Briefcase },
  { id: "location", label: "Location", icon: MapPin },
  { id: "links", label: "Links", icon: Link2 },
  { id: "status", label: "Status", icon: Tag },
];

const DEFAULT_VISIBLE = new Set(["name", "email", "company", "location", "status"]);

const SEARCH_FIELDS = [
  { id: "all", label: "All fields" },
  { id: "email", label: "Email" },
  { id: "name", label: "Name" },
  { id: "company", label: "Company" },
  { id: "location", label: "Location" },
  { id: "phone", label: "Phone" },
  { id: "job_title", label: "Job Title" },
];

const EMPTY_LEAD_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  company: "",
  job_title: "",
  location: "",
  linkedin_url: "",
  website: "",
  notes: "",
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1 text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function LeadDetailPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const customKeys = Object.keys(lead.custom_fields ?? {});
  const name = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unknown";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-sm shrink-0">
              {name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold text-[var(--foreground)]">{name}</p>
              {lead.job_title && <p className="text-xs text-[var(--muted)] font-normal">{lead.job_title}</p>}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[lead.status] ?? "muted"}>{lead.status}</Badge>
          </div>

          <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
            {[
              { icon: Mail, label: "Email", value: lead.email, copy: true },
              { icon: Phone, label: "Phone", value: lead.phone, copy: true },
              { icon: Building2, label: "Company", value: lead.company },
              { icon: MapPin, label: "Location", value: lead.location },
            ].filter((field) => field.value).map(({ icon: Icon, label, value, copy }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-2.5">
                <Icon className="h-4 w-4 text-[var(--muted)] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide font-medium">{label}</p>
                  <p className="text-sm text-[var(--foreground)] truncate">{value}</p>
                </div>
                {copy && value && <CopyButton value={value} />}
              </div>
            ))}
            {(lead.linkedin_url || lead.website) && (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <Link2 className="h-4 w-4 text-[var(--muted)] shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide font-medium">Links</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {lead.linkedin_url && (
                      <a
                        href={lead.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> LinkedIn
                      </a>
                    )}
                    {lead.website && (
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" /> Website
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            {lead.notes && (
              <div className="px-4 py-2.5">
                <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide font-medium mb-1">Notes</p>
                <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">{lead.notes}</p>
              </div>
            )}
          </div>

          {customKeys.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5" /> Custom Variables
              </p>
              <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
                {customKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between px-4 py-2.5 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide font-medium">
                        {"{{"}{key}{"}}"}
                      </p>
                      <p className="text-sm text-[var(--foreground)] truncate">{lead.custom_fields![key]}</p>
                    </div>
                    <CopyButton value={`{{${key}}}`} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[var(--muted)] mt-2">
                Use these as variables in Prompt Studio or campaign prompts.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LeadListDetail({
  list,
  initialLeads,
  senderProfiles,
  emailAccounts,
  promptDefaults,
}: {
  list: LeadList;
  initialLeads: Lead[];
  senderProfiles: SenderProfile[];
  emailAccounts: EmailAccount[];
  promptDefaults: { subjectPrompt: string; bodyPrompt: string };
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [showSearchFields, setShowSearchFields] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_VISIBLE));
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [showAddLead, setShowAddLead] = useState(false);
  const [leadForm, setLeadForm] = useState(EMPTY_LEAD_FORM);
  const [customFieldRows, setCustomFieldRows] = useState<Array<{ key: string; value: string }>>([]);
  const [savingLead, setSavingLead] = useState(false);

  const [showTestSend, setShowTestSend] = useState(false);
  const [testLeadId, setTestLeadId] = useState(initialLeads[0]?.id ?? "");
  const [testProfileId, setTestProfileId] = useState(senderProfiles[0]?.id ?? "");
  const [testAccountId, setTestAccountId] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [testSendResult, setTestSendResult] = useState<{ sent_to: string; subject: string } | null>(null);
  const [testSendError, setTestSendError] = useState("");
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  const customVarKeys = useMemo(() => {
    const keys = new Set<string>();
    leads.forEach((lead) => Object.keys(lead.custom_fields ?? {}).forEach((key) => keys.add(key)));
    return [...keys];
  }, [leads]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    if (!query) return leads;

    return leads.filter((lead) => {
      if (searchField === "all") {
        return (
          lead.email?.toLowerCase().includes(query) ||
          lead.first_name?.toLowerCase().includes(query) ||
          lead.last_name?.toLowerCase().includes(query) ||
          lead.company?.toLowerCase().includes(query) ||
          lead.location?.toLowerCase().includes(query) ||
          lead.phone?.toLowerCase().includes(query) ||
          lead.job_title?.toLowerCase().includes(query) ||
          Object.values(lead.custom_fields ?? {}).some((value) => value.toLowerCase().includes(query))
        );
      }

      if (searchField === "name") {
        return `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.toLowerCase().includes(query);
      }

      return (lead[searchField as keyof Lead] as string | null | undefined)?.toLowerCase().includes(query) ?? false;
    });
  }, [leads, search, searchField]);

  const availableAccounts = useMemo(
    () => emailAccounts.filter((account) => account.sender_profile_id === testProfileId),
    [emailAccounts, testProfileId]
  );

  function toggleCol(id: string) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function resetLeadForm() {
    setLeadForm(EMPTY_LEAD_FORM);
    setCustomFieldRows([]);
  }

  function openTestSendDialog() {
    const leadId = testLeadId || leads[0]?.id || "";
    const profileId = testProfileId || senderProfiles[0]?.id || "";
    const accountsForProfile = emailAccounts.filter((account) => account.sender_profile_id === profileId);
    const accountId =
      accountsForProfile.find((account) => account.is_active)?.id ??
      accountsForProfile[0]?.id ??
      "";

    setTestLeadId(leadId);
    setTestProfileId(profileId);
    setTestAccountId(accountId);
    setTestSendError("");
    setTestSendResult(null);
    setShowPromptPreview(false);
    setShowTestSend(true);
  }

  function handleTestProfileChange(profileId: string) {
    const accountsForProfile = emailAccounts.filter((account) => account.sender_profile_id === profileId);
    const accountId =
      accountsForProfile.find((account) => account.is_active)?.id ??
      accountsForProfile[0]?.id ??
      "";

    setTestProfileId(profileId);
    setTestAccountId(accountId);
  }

  async function handleAddLead() {
    setSavingLead(true);
    const customFields = Object.fromEntries(
      customFieldRows
        .map((field) => [field.key.trim(), field.value.trim()] as const)
        .filter(([key, value]) => key && value)
    );

    const res = await apiFetch(`/api/leads/list/${list.id}`, {
      method: "POST",
      body: JSON.stringify({
        ...leadForm,
        custom_fields: customFields,
      }),
    });

    setSavingLead(false);
    if (!res.ok) return;

    const { lead } = await res.json();
    setLeads((prev) => [lead, ...prev]);
    setShowAddLead(false);
    resetLeadForm();
    setTestLeadId(lead.id);
    router.refresh();
  }

  async function handleTestSend() {
    setSendingTest(true);
    setTestSendError("");
    setTestSendResult(null);

    const res = await apiFetch("/api/leads/test-send", {
      method: "POST",
      body: JSON.stringify({
        leadId: testLeadId,
        profileId: testProfileId,
        accountId: testAccountId,
      }),
    });

    const data = await res.json();
    setSendingTest(false);

    if (!res.ok) {
      setTestSendError(data.error ?? "Failed to send test email");
      return;
    }

    setTestSendResult({
      sent_to: data.sent_to,
      subject: data.subject,
    });
  }

  const activeSearchLabel = SEARCH_FIELDS.find((field) => field.id === searchField)?.label ?? "All fields";
  const canTestSend = leads.length > 0 && senderProfiles.length > 0 && emailAccounts.length > 0;

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--muted)]">
            {leads.length.toLocaleString()} leads
            {list.location_tag ? ` · ${list.location_tag}` : ""}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">
            Add leads manually, store custom variables, or send one AI-generated test email from this list.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setShowAddLead(true)}>
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
          <Button onClick={openTestSendDialog} disabled={!canTestSend}>
            <Send className="h-4 w-4" />
            AI Test Send
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex-1 min-w-[220px] max-w-sm">
          <button
            onClick={() => setShowSearchFields((value) => !value)}
            className="flex items-center gap-1 px-3 py-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)] border-r border-[var(--border)] whitespace-nowrap shrink-0 transition-colors"
          >
            {activeSearchLabel} <ChevronDown className="h-3 w-3" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
            <input
              placeholder="Search..."
              className="w-full bg-transparent pl-8 pr-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] outline-none"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {showSearchFields && (
          <div className="absolute z-20 mt-9 ml-0 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
            {SEARCH_FIELDS.map((field) => (
              <button
                key={field.id}
                onClick={() => {
                  setSearchField(field.id);
                  setShowSearchFields(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-2)] ${
                  searchField === field.id ? "text-[var(--accent)] font-medium" : "text-[var(--foreground)]"
                }`}
              >
                {field.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-1.5 flex-wrap">
          {ALL_COLUMNS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => toggleCol(id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                visibleCols.has(id)
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]"
                  : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30"
              }`}
            >
              {label}
              {visibleCols.has(id) && <X className="h-3 w-3" />}
            </button>
          ))}

          {customVarKeys.map((key) => (
            <button
              key={key}
              onClick={() => toggleCol(`custom_${key}`)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                visibleCols.has(`custom_${key}`)
                  ? "bg-[var(--accent)]/15 border-[var(--accent)]/40 text-[var(--accent)]"
                  : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/30"
              }`}
            >
              <Tag className="h-3 w-3" />
              {"{{"}{key}{"}}"}
              {visibleCols.has(`custom_${key}`) && <X className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                {ALL_COLUMNS.filter((column) => visibleCols.has(column.id)).map((column) => (
                  <th
                    key={column.id}
                    className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider whitespace-nowrap"
                  >
                    {column.label}
                  </th>
                ))}
                {customVarKeys.filter((key) => visibleCols.has(`custom_${key}`)).map((key) => (
                  <th
                    key={key}
                    className="text-left px-4 py-3 text-xs font-semibold text-[var(--accent)] uppercase tracking-wider whitespace-nowrap"
                  >
                    {"{{"}{key}{"}}"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={visibleCols.size + 1} className="text-center py-12 text-[var(--muted)] text-sm">
                    No leads found
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-[var(--surface-2)]/60 transition-colors cursor-pointer"
                  >
                    {visibleCols.has("name") && (
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--foreground)] whitespace-nowrap">
                          {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                        </p>
                        {lead.job_title && (
                          <p className="text-xs text-[var(--muted)] mt-0.5 truncate max-w-[160px]">{lead.job_title}</p>
                        )}
                      </td>
                    )}
                    {visibleCols.has("email") && (
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                          <Mail className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
                          <span className="truncate max-w-[200px]">{lead.email}</span>
                        </span>
                      </td>
                    )}
                    {visibleCols.has("company") && (
                      <td className="px-4 py-3">
                        {lead.company ? (
                          <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                            <Building2 className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
                            <span className="truncate max-w-[160px]">{lead.company}</span>
                          </span>
                        ) : <span className="text-[var(--muted)]">—</span>}
                      </td>
                    )}
                    {visibleCols.has("phone") && (
                      <td className="px-4 py-3 text-[var(--foreground)] whitespace-nowrap">
                        {lead.phone || <span className="text-[var(--muted)]">—</span>}
                      </td>
                    )}
                    {visibleCols.has("job_title") && (
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        <span className="truncate max-w-[160px] block">
                          {lead.job_title || <span className="text-[var(--muted)]">—</span>}
                        </span>
                      </td>
                    )}
                    {visibleCols.has("location") && (
                      <td className="px-4 py-3">
                        {lead.location ? (
                          <span className="flex items-center gap-1.5 text-[var(--muted)]">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            {lead.location}
                          </span>
                        ) : <span className="text-[var(--muted)]">—</span>}
                      </td>
                    )}
                    {visibleCols.has("links") && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {lead.website && (
                            <a
                              href={lead.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors"
                            >
                              <Globe className="h-4 w-4" />
                            </a>
                          )}
                          {!lead.linkedin_url && !lead.website && <span className="text-[var(--muted)]">—</span>}
                        </div>
                      </td>
                    )}
                    {visibleCols.has("status") && (
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANT[lead.status] ?? "muted"}>{lead.status}</Badge>
                      </td>
                    )}
                    {customVarKeys.filter((key) => visibleCols.has(`custom_${key}`)).map((key) => (
                      <td key={key} className="px-4 py-3 text-[var(--foreground)]">
                        <span className="truncate max-w-[160px] block text-sm">
                          {lead.custom_fields?.[key] || <span className="text-[var(--muted)]">—</span>}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        {filtered.length === leads.length
          ? `${leads.length.toLocaleString()} leads`
          : `${filtered.length.toLocaleString()} of ${leads.length.toLocaleString()} leads`}
        {customVarKeys.length > 0 && (
          <span className="ml-2 text-[var(--accent)]">
            · {customVarKeys.length} custom variable{customVarKeys.length > 1 ? "s" : ""}
          </span>
        )}
      </p>

      {selectedLead && (
        <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}

      <Dialog open={showAddLead} onOpenChange={setShowAddLead}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Lead Manually</DialogTitle>
            <DialogDescription>
              Add a single lead to this folder and include any extra fields you want to use later as prompt variables.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["first_name", "First Name"],
                ["last_name", "Last Name"],
                ["email", "Email *"],
                ["phone", "Phone"],
                ["company", "Company"],
                ["job_title", "Job Title"],
                ["location", "Location"],
                ["linkedin_url", "LinkedIn URL"],
                ["website", "Website"],
              ].map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label>{label}</Label>
                  <Input
                    value={leadForm[key as keyof typeof leadForm]}
                    onChange={(event) =>
                      setLeadForm((prev) => ({ ...prev, [key]: event.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={leadForm.notes}
                onChange={(event) => setLeadForm((prev) => ({ ...prev, notes: event.target.value }))}
                className="min-h-[90px]"
              />
            </div>

            <div className="space-y-3 rounded-xl border border-[var(--border)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">Custom Fields</p>
                  <p className="text-xs text-[var(--muted)]">Each field becomes a variable like {"{{field_name}}"}.</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCustomFieldRows((prev) => [...prev, { key: "", value: "" }])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Field
                </Button>
              </div>

              {customFieldRows.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No custom fields yet.</p>
              ) : (
                <div className="space-y-2">
                  {customFieldRows.map((field, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        placeholder="field_name"
                        value={field.key}
                        onChange={(event) =>
                          setCustomFieldRows((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, key: event.target.value } : item
                            )
                          )
                        }
                      />
                      <Input
                        placeholder="Value"
                        value={field.value}
                        onChange={(event) =>
                          setCustomFieldRows((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, value: event.target.value } : item
                            )
                          )
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setCustomFieldRows((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddLead(false);
                resetLeadForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddLead} disabled={savingLead || !leadForm.email.trim()}>
              {savingLead ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTestSend} onOpenChange={setShowTestSend}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>AI Test Send</DialogTitle>
            <DialogDescription>
              Generate and send one email through a selected SMTP inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Lead</Label>
                <Select value={testLeadId} onValueChange={setTestLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.email} - {lead.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Sender Profile</Label>
                <Select value={testProfileId} onValueChange={handleTestProfileChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sender profile" />
                  </SelectTrigger>
                  <SelectContent>
                    {senderProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Email Account</Label>
                <Select value={testAccountId} onValueChange={setTestAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an email account" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label} - {account.from_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]">
              <button
                type="button"
                onClick={() => setShowPromptPreview((value) => !value)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[var(--foreground)]">Prompt Studio defaults</span>
                    <span className="block truncate text-xs text-[var(--muted)]">
                      Subject and body prompts will be applied automatically.
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium text-[var(--accent)]">
                  {showPromptPreview ? "Hide" : "Preview"}
                </span>
              </button>

              {showPromptPreview && (
                <div className="border-t border-[var(--border)] px-4 py-3">
                  <div className="grid gap-3">
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                        <FileText className="h-3.5 w-3.5" />
                        Subject
                      </p>
                      <p className="max-h-16 overflow-auto rounded bg-[var(--surface)] px-3 py-2 text-xs text-[var(--foreground)]">
                        {promptDefaults.subjectPrompt}
                      </p>
                    </div>
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
                        <FileText className="h-3.5 w-3.5" />
                        Body
                      </p>
                      <p className="max-h-28 overflow-auto rounded bg-[var(--surface)] px-3 py-2 text-xs leading-relaxed text-[var(--foreground)]">
                        {promptDefaults.bodyPrompt}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!canTestSend && (
              <p className="text-sm text-[var(--danger)]">
                Add at least one lead, sender profile, and email account before sending a test email.
              </p>
            )}

            {testSendError && (
              <p className="rounded-lg border border-[var(--danger)]/30 bg-[var(--danger)]/10 px-3 py-2 text-sm text-[var(--danger)]">
                {testSendError}
              </p>
            )}

            {testSendResult && (
              <p className="rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]">
                Sent to {testSendResult.sent_to} with subject: {testSendResult.subject}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowTestSend(false);
                setTestSendError("");
                setTestSendResult(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={sendingTest || !testLeadId || !testProfileId || !testAccountId}
            >
              {sendingTest ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Generate and Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
