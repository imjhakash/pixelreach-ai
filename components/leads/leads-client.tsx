"use client";

import { useState, useRef } from "react";
import {
  Upload, FolderOpen, Users, MapPin, Trash2,
  Plus, FileSpreadsheet, Eye, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import Link from "next/link";
import { apiFetch } from "@/lib/api-fetch";

interface LeadList {
  id: string;
  name: string;
  location_tag: string | null;
  total_leads: number;
  created_at: string;
  leads?: { count: number }[];
}

interface ParsedLead {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  location?: string;
  linkedin_url?: string;
  website?: string;
  notes?: string;
  [key: string]: string | undefined;
}

interface LeadsClientProps {
  initialLists: LeadList[];
  userId: string;
}

const FIELD_ALIASES: Record<string, string> = {
  "first name": "first_name", firstname: "first_name", "given name": "first_name",
  "last name": "last_name", lastname: "last_name", surname: "last_name",
  email: "email", "email address": "email",
  phone: "phone", telephone: "phone", mobile: "phone",
  company: "company", organization: "company", "company name": "company",
  "job title": "job_title", title: "job_title", role: "job_title", position: "job_title",
  location: "location", city: "location", country: "location",
  linkedin: "linkedin_url", "linkedin url": "linkedin_url", "linkedin profile": "linkedin_url",
  website: "website", "company website": "website", url: "website",
};

function normalizeHeader(header: string): string {
  const lower = header.toLowerCase().trim();
  return FIELD_ALIASES[lower] ?? lower.replace(/\s+/g, "_");
}

export function LeadsClient({ initialLists, userId }: LeadsClientProps) {
  const [lists, setLists] = useState<LeadList[]>(initialLists);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [listName, setListName] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [parseError, setParseError] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseFile(file: File) {
    setParseError("");
    setParsedLeads([]);
    setFileName(file.name);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const normalized = results.data.map((row) => {
            const out: ParsedLead = {};
            for (const [k, v] of Object.entries(row)) {
              out[normalizeHeader(k)] = v as string;
            }
            return out;
          });
          setParsedLeads(normalized);
          if (!listName) setListName(file.name.replace(/\.[^.]+$/, ""));
          const loc = normalized[0]?.location ?? "";
          if (!locationTag && loc) setLocationTag(loc);
        },
        error: (err) => setParseError(err.message),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        const normalized = json.map((row) => {
          const out: ParsedLead = {};
          for (const [k, v] of Object.entries(row)) {
            out[normalizeHeader(String(k))] = String(v);
          }
          return out;
        });
        setParsedLeads(normalized);
        if (!listName) setListName(file.name.replace(/\.[^.]+$/, ""));
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === "json") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string) as Record<string, string>[];
          const arr = Array.isArray(json) ? json : [json];
          const normalized = arr.map((row) => {
            const out: ParsedLead = {};
            for (const [k, v] of Object.entries(row)) {
              out[normalizeHeader(k)] = String(v);
            }
            return out;
          });
          setParsedLeads(normalized);
          if (!listName) setListName(file.name.replace(/\.[^.]+$/, ""));
        } catch {
          setParseError("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    } else {
      setParseError("Unsupported file type. Please upload CSV, XLSX, or JSON.");
    }
  }

  async function handleUpload() {
    if (!listName.trim() || parsedLeads.length === 0) return;
    setUploading(true);

    const res = await apiFetch("/api/leads/upload", {
      method: "POST",
      body: JSON.stringify({ listName, locationTag, leads: parsedLeads }),
    });

    if (res.ok) {
      const { list } = await res.json();
      setLists((prev) => [list, ...prev]);
      setShowUpload(false);
      setParsedLeads([]);
      setListName("");
      setLocationTag("");
      setFileName("");
    } else {
      const { error } = await res.json();
      setParseError(error ?? "Upload failed");
    }
    setUploading(false);
  }

  async function handleDelete(id: string) {
    await apiFetch(`/api/leads/list/${id}`, { method: "DELETE" });
    setLists((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="p-6 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">
          {lists.length} {lists.length === 1 ? "list" : "lists"} · {lists.reduce((a, l) => a + (l.leads?.[0]?.count ?? l.total_leads ?? 0), 0).toLocaleString()} total leads
        </p>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="h-4 w-4" />
          Import Leads
        </Button>
      </div>

      {/* Lists Grid */}
      {lists.length === 0 ? (
        <div
          onClick={() => setShowUpload(true)}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] py-20 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors group"
        >
          <Upload className="h-10 w-10 text-[var(--muted)] group-hover:text-[var(--accent)] mb-3 transition-colors" />
          <p className="text-sm font-medium text-[var(--foreground)]">Import your first leads</p>
          <p className="text-xs text-[var(--muted)] mt-1">Supports CSV, XLSX, and JSON files</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => {
            const count = list.leads?.[0]?.count ?? list.total_leads ?? 0;
            return (
              <Card key={list.id} className="group hover:border-[var(--accent)]/50 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)]/10">
                      <FolderOpen className="h-5 w-5 text-[var(--accent)]" />
                    </div>
                    <button
                      onClick={() => handleDelete(list.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted)] hover:text-[var(--danger)] p-1 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="font-semibold text-[var(--foreground)] mb-1 truncate">{list.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)] mb-4">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {count.toLocaleString()} leads
                    </span>
                    {list.location_tag && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {list.location_tag}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/leads/${list.id}`} className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Add more card */}
          <div
            onClick={() => setShowUpload(true)}
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)] p-8 cursor-pointer hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-colors group min-h-[180px]"
          >
            <Plus className="h-8 w-8 text-[var(--muted)] group-hover:text-[var(--accent)] mb-2 transition-colors" />
            <p className="text-sm text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors">Import more leads</p>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Lead List</DialogTitle>
            <DialogDescription>
              Upload a CSV, XLSX, or JSON file. We'll auto-detect all fields.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) parseFile(file);
              }}
              onClick={() => fileRef.current?.click()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-8 cursor-pointer transition-colors ${
                dragOver ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] hover:border-[var(--accent)]/50"
              }`}
            >
              <FileSpreadsheet className="h-8 w-8 text-[var(--muted)] mb-2" />
              {fileName ? (
                <p className="text-sm font-medium text-[var(--accent)]">{fileName}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-[var(--foreground)]">Drop file here or click to browse</p>
                  <p className="text-xs text-[var(--muted)] mt-1">CSV · XLSX · JSON</p>
                </>
              )}
              {parsedLeads.length > 0 && (
                <Badge variant="success" className="mt-2">{parsedLeads.length} leads detected</Badge>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls,.json"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }}
            />

            {parseError && (
              <p className="text-xs text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-lg px-3 py-2">
                {parseError}
              </p>
            )}

            {/* Preview */}
            {parsedLeads.length > 0 && (
              <div className="rounded-lg border border-[var(--border)] overflow-hidden">
                <p className="text-xs font-medium text-[var(--muted)] px-3 py-2 bg-[var(--surface-2)] border-b border-[var(--border)]">
                  Preview (first 3 rows)
                </p>
                <div className="overflow-x-auto max-h-36">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        {Object.keys(parsedLeads[0]).slice(0, 6).map((k) => (
                          <th key={k} className="text-left px-3 py-1.5 text-[var(--muted)] font-medium">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {parsedLeads.slice(0, 3).map((row, i) => (
                        <tr key={i} className="border-b border-[var(--border)]/50">
                          {Object.values(row).slice(0, 6).map((v, j) => (
                            <td key={j} className="px-3 py-1.5 text-[var(--foreground)] truncate max-w-[100px]">{String(v ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>List Name</Label>
                <Input
                  placeholder="e.g. Dutch Roofers Q2"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location Tag <span className="text-[var(--muted)]">(optional)</span></Label>
                <Input
                  placeholder="e.g. Netherlands"
                  value={locationTag}
                  onChange={(e) => setLocationTag(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="secondary" onClick={() => setShowUpload(false)}>Cancel</Button>
            <Button
              onClick={handleUpload}
              disabled={uploading || parsedLeads.length === 0 || !listName.trim()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import {parsedLeads.length > 0 ? `${parsedLeads.length} leads` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
