"use client";

import { useState, useMemo } from "react";
import {
  Mail, Phone, Building2, MapPin, ExternalLink, Globe,
  Search, X, ChevronDown, Tag, User, Briefcase, Link2,
  SlidersHorizontal, Copy, Check,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Lead, LeadList } from "@/lib/types";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "muted"> = {
  new: "muted", emailed: "default", replied: "success",
  bounced: "danger", unsubscribed: "warning",
};

const ALL_COLUMNS = [
  { id: "name",      label: "Name",      icon: User },
  { id: "email",     label: "Email",     icon: Mail },
  { id: "company",   label: "Company",   icon: Building2 },
  { id: "phone",     label: "Phone",     icon: Phone },
  { id: "job_title", label: "Job Title", icon: Briefcase },
  { id: "location",  label: "Location",  icon: MapPin },
  { id: "links",     label: "Links",     icon: Link2 },
  { id: "status",    label: "Status",    icon: Tag },
];

const DEFAULT_VISIBLE = new Set(["name", "email", "company", "location", "status"]);

const SEARCH_FIELDS = [
  { id: "all",      label: "All fields" },
  { id: "email",    label: "Email" },
  { id: "name",     label: "Name" },
  { id: "company",  label: "Company" },
  { id: "location", label: "Location" },
  { id: "phone",    label: "Phone" },
  { id: "job_title",label: "Job Title" },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
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
          {/* Status */}
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[lead.status] ?? "muted"}>{lead.status}</Badge>
          </div>

          {/* Core fields */}
          <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] overflow-hidden">
            {[
              { icon: Mail, label: "Email", value: lead.email, copy: true },
              { icon: Phone, label: "Phone", value: lead.phone, copy: true },
              { icon: Building2, label: "Company", value: lead.company },
              { icon: MapPin, label: "Location", value: lead.location },
            ].filter((f) => f.value).map(({ icon: Icon, label, value, copy }) => (
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
                      <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> LinkedIn
                      </a>
                    )}
                    {lead.website && (
                      <a href={lead.website} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1">
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
                <p className="text-sm text-[var(--foreground)]">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Custom variables */}
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
                Use these as template variables in your campaign prompts.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LeadListDetail({ list, initialLeads }: { list: LeadList; initialLeads: Lead[] }) {
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("all");
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [showSearchFields, setShowSearchFields] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(new Set(DEFAULT_VISIBLE));
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const customVarKeys = useMemo(() => {
    const keys = new Set<string>();
    initialLeads.forEach((l) => Object.keys(l.custom_fields ?? {}).forEach((k) => keys.add(k)));
    return [...keys];
  }, [initialLeads]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return initialLeads;
    return initialLeads.filter((l) => {
      if (searchField === "all") {
        return (
          l.email?.toLowerCase().includes(q) ||
          l.first_name?.toLowerCase().includes(q) ||
          l.last_name?.toLowerCase().includes(q) ||
          l.company?.toLowerCase().includes(q) ||
          l.location?.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.job_title?.toLowerCase().includes(q) ||
          Object.values(l.custom_fields ?? {}).some((v) => v.toLowerCase().includes(q))
        );
      }
      if (searchField === "name") return `${l.first_name ?? ""} ${l.last_name ?? ""}`.toLowerCase().includes(q);
      return (l[searchField as keyof Lead] as string ?? "").toLowerCase().includes(q);
    });
  }, [initialLeads, search, searchField]);

  function toggleCol(id: string) {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  const activeSearchLabel = SEARCH_FIELDS.find((f) => f.id === searchField)?.label ?? "All fields";

  return (
    <div className="p-6 space-y-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search with field selector */}
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden flex-1 min-w-[220px] max-w-sm">
          <button
            onClick={() => setShowSearchFields((v) => !v)}
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
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)]">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search field dropdown */}
        {showSearchFields && (
          <div className="absolute z-20 mt-9 ml-0 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg overflow-hidden">
            {SEARCH_FIELDS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setSearchField(f.id); setShowSearchFields(false); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-2)] ${searchField === f.id ? "text-[var(--accent)] font-medium" : "text-[var(--foreground)]"}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Column chips */}
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

          {/* Custom variable chips */}
          {customVarKeys.map((key) => (
            <button
              key={key}
              onClick={() => toggleCol(`custom_${key}`)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                visibleCols.has(`custom_${key}`)
                  ? "bg-purple-500/15 border-purple-500/40 text-purple-400"
                  : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--muted)] hover:border-purple-400/30"
              }`}
            >
              <Tag className="h-3 w-3" />
              {"{{"}{key}{"}}"}
              {visibleCols.has(`custom_${key}`) && <X className="h-3 w-3" />}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                {ALL_COLUMNS.filter((c) => visibleCols.has(c.id)).map((c) => (
                  <th key={c.id} className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                {customVarKeys.filter((k) => visibleCols.has(`custom_${k}`)).map((key) => (
                  <th key={key} className="text-left px-4 py-3 text-xs font-semibold text-purple-400 uppercase tracking-wider whitespace-nowrap">
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
                            <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                          {lead.website && (
                            <a href={lead.website} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
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
                    {/* Custom variable columns */}
                    {customVarKeys.filter((k) => visibleCols.has(`custom_${k}`)).map((key) => (
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
        {filtered.length === initialLeads.length
          ? `${initialLeads.length.toLocaleString()} leads`
          : `${filtered.length.toLocaleString()} of ${initialLeads.length.toLocaleString()} leads`}
        {customVarKeys.length > 0 && (
          <span className="ml-2 text-purple-400">· {customVarKeys.length} custom variable{customVarKeys.length > 1 ? "s" : ""}</span>
        )}
      </p>

      {/* Lead detail panel */}
      {selectedLead && (
        <LeadDetailPanel lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
