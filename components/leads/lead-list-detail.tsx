"use client";

import { useState } from "react";
import { Mail, Phone, Building2, MapPin, ExternalLink, Globe, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { Lead, LeadList } from "@/lib/types";

const STATUS_VARIANT: Record<string, "default" | "success" | "warning" | "danger" | "muted"> = {
  new: "muted",
  emailed: "default",
  replied: "success",
  bounced: "danger",
  unsubscribed: "warning",
};

export function LeadListDetail({ list, initialLeads }: { list: LeadList; initialLeads: Lead[] }) {
  const [search, setSearch] = useState("");

  const filtered = initialLeads.filter((l) => {
    const q = search.toLowerCase();
    return (
      !q ||
      l.email?.toLowerCase().includes(q) ||
      l.first_name?.toLowerCase().includes(q) ||
      l.last_name?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 space-y-4">
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
        <Input
          placeholder="Search leads..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Links</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[var(--muted)] text-sm">
                    No leads found
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">
                          {[lead.first_name, lead.last_name].filter(Boolean).join(" ") || "—"}
                        </p>
                        {lead.job_title && (
                          <p className="text-xs text-[var(--muted)]">{lead.job_title}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                        <Mail className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
                        {lead.email}
                      </span>
                      {lead.phone && (
                        <span className="flex items-center gap-1.5 text-xs text-[var(--muted)] mt-0.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          {lead.phone}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.company ? (
                        <span className="flex items-center gap-1.5 text-[var(--foreground)]">
                          <Building2 className="h-3.5 w-3.5 text-[var(--muted)] shrink-0" />
                          {lead.company}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {lead.location ? (
                        <span className="flex items-center gap-1.5 text-[var(--muted)]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {lead.location}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {lead.linkedin_url && (
                          <a href={lead.linkedin_url} target="_blank" rel="noopener noreferrer"
                            className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {lead.website && (
                          <a href={lead.website} target="_blank" rel="noopener noreferrer"
                            className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors">
                            <Globe className="h-4 w-4" />
                          </a>
                        )}
                        {!lead.linkedin_url && !lead.website && "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[lead.status] ?? "muted"}>
                        {lead.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-[var(--muted)]">
        Showing {filtered.length} of {initialLeads.length} leads
      </p>
    </div>
  );
}
