"use client";

import { useState, useMemo } from "react";
import {
  Bot, Database, Globe, Mail, LayoutTemplate, Calendar, Search,
  Palette, Share2, BarChart2, FileText, Code2, Cpu, Globe2,
  Terminal, ChevronRight, ChevronDown, Check, Loader2,
  Plug, ExternalLink, Sparkles, Info, Wrench, Star,
  Shield, Eye, EyeOff, Copy, CheckCircle2, BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────
type ToolParam = { name: string; type: string; required: boolean; description: string };
type MCPTool = { id: string; name: string; description: string; params?: ToolParam[] };

type Category = "ai" | "database" | "email" | "deployment" | "productivity" | "design" | "seo" | "browser" | "social" | "data";

type ConfigField = { key: string; label: string; type: "text" | "password" | "url"; placeholder: string; required: boolean };

type MCPPlatform = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  category: Category;
  tools: MCPTool[];
  configFields: ConfigField[];
  docsUrl: string;
  featured?: boolean;
};

// ─── Platform Catalog ─────────────────────────────────────────────────────────
const PLATFORMS: MCPPlatform[] = [
  {
    id: "anthropic",
    name: "Claude / Anthropic",
    tagline: "AI core engine",
    description: "Connect Anthropic's Claude models for AI text generation, analysis, tool use, and multi-step agents with streaming support.",
    icon: Bot,
    iconColor: "#6366f1",
    category: "ai",
    featured: true,
    docsUrl: "https://docs.anthropic.com",
    configFields: [
      { key: "anthropic_api_key", label: "Anthropic API Key", type: "password", placeholder: "sk-ant-api03-••••", required: true },
      { key: "anthropic_model", label: "Default Model", type: "text", placeholder: "claude-sonnet-4-6", required: false },
    ],
    tools: [
      { id: "messages", name: "Messages API", description: "Send messages and get responses from Claude models with tool use support.", params: [{ name: "model", type: "string", required: true, description: "Claude model ID" }, { name: "messages", type: "array", required: true, description: "Conversation history" }, { name: "tools", type: "array", required: false, description: "Tool definitions for function calling" }] },
      { id: "streaming", name: "Streaming Responses", description: "Stream Claude output in real-time for low-latency UX." },
      { id: "tool_use", name: "Tool Use / Function Calling", description: "Let Claude call your functions and APIs intelligently." },
      { id: "vision", name: "Vision / Image Analysis", description: "Analyze images, screenshots, PDFs and documents." },
      { id: "batch", name: "Batch Processing", description: "Process thousands of requests asynchronously at 50% cost." },
      { id: "prompt_caching", name: "Prompt Caching", description: "Cache large system prompts to save tokens and latency." },
      { id: "files_api", name: "Files API", description: "Upload and reference files in conversations." },
      { id: "citations", name: "Citations", description: "Get source citations grounded in your documents." },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "Multi-model AI gateway",
    description: "Access 200+ AI models (GPT-4o, Gemini, Mistral, Llama) through a single unified API. Already wired into PixelReach email generation.",
    icon: Cpu,
    iconColor: "#8b5cf6",
    category: "ai",
    featured: true,
    docsUrl: "https://openrouter.ai/docs",
    configFields: [
      { key: "openrouter_api_key", label: "OpenRouter API Key", type: "password", placeholder: "sk-or-v1-••••", required: true },
    ],
    tools: [
      { id: "chat_completion", name: "Chat Completion", description: "Generate text using any of 200+ models via unified API.", params: [{ name: "model", type: "string", required: true, description: "Model ID (e.g. openai/gpt-4o)" }, { name: "messages", type: "array", required: true, description: "Chat messages" }] },
      { id: "analyze_image", name: "Analyze Image", description: "Vision analysis using multimodal models." },
      { id: "analyze_audio", name: "Analyze Audio", description: "Transcription and audio understanding." },
      { id: "generate_image", name: "Generate Image", description: "Create images using DALL-E, Flux, or Stable Diffusion." },
      { id: "generate_video", name: "Generate Video", description: "AI video generation via supported models." },
      { id: "get_model_info", name: "Get Model Info", description: "Fetch pricing, context length, and capabilities for any model." },
      { id: "search_models", name: "Search Models", description: "Find models by capability, cost, or context window." },
    ],
  },
  {
    id: "supabase",
    name: "Supabase",
    tagline: "Postgres database & auth",
    description: "Manage your Supabase project: execute SQL, run migrations, deploy edge functions, manage branches, and inspect tables.",
    icon: Database,
    iconColor: "#22c55e",
    category: "database",
    featured: true,
    docsUrl: "https://supabase.com/docs",
    configFields: [
      { key: "supabase_url", label: "Project URL", type: "url", placeholder: "https://xxxx.supabase.co", required: true },
      { key: "supabase_anon_key", label: "Anon Public Key", type: "password", placeholder: "eyJhbGciOiJIUzI1NiIs••••", required: true },
      { key: "supabase_service_key", label: "Service Role Key (optional)", type: "password", placeholder: "eyJhbGciOiJIUzI1NiIs••••", required: false },
    ],
    tools: [
      { id: "execute_sql", name: "Execute SQL", description: "Run arbitrary SQL queries against your Postgres database.", params: [{ name: "query", type: "string", required: true, description: "SQL statement to execute" }, { name: "project_id", type: "string", required: true, description: "Supabase project ID" }] },
      { id: "list_tables", name: "List Tables", description: "Inspect all tables, columns, and types in the database." },
      { id: "apply_migration", name: "Apply Migration", description: "Apply a SQL migration file to the database." },
      { id: "list_migrations", name: "List Migrations", description: "View all applied and pending migrations." },
      { id: "deploy_edge_function", name: "Deploy Edge Function", description: "Deploy a Deno edge function to your Supabase project." },
      { id: "list_edge_functions", name: "List Edge Functions", description: "Browse all deployed edge functions." },
      { id: "create_branch", name: "Create Branch", description: "Create a database branch for safe development." },
      { id: "generate_typescript_types", name: "Generate TypeScript Types", description: "Auto-generate TypeScript types from your DB schema." },
      { id: "get_logs", name: "Get Logs", description: "Fetch runtime logs from edge functions and API gateway." },
      { id: "get_advisors", name: "Get Advisors", description: "Security and performance advisor recommendations." },
    ],
  },
  {
    id: "vercel",
    name: "Vercel",
    tagline: "Deploy & manage projects",
    description: "Deploy apps, inspect build logs, monitor runtime errors, manage teams, and track deployments on Vercel.",
    icon: Globe,
    iconColor: "#ffffff",
    category: "deployment",
    docsUrl: "https://vercel.com/docs",
    configFields: [
      { key: "vercel_token", label: "Vercel API Token", type: "password", placeholder: "••••••••••••••••••••••••", required: true },
      { key: "vercel_team_id", label: "Team ID (optional)", type: "text", placeholder: "team_xxxxxxxxxxxx", required: false },
    ],
    tools: [
      { id: "list_projects", name: "List Projects", description: "Browse all Vercel projects in your account or team." },
      { id: "get_project", name: "Get Project", description: "Inspect project configuration, domains, and environment variables." },
      { id: "list_deployments", name: "List Deployments", description: "View recent deployments with their status and URLs." },
      { id: "get_deployment", name: "Get Deployment", description: "Get details for a specific deployment." },
      { id: "deploy_to_vercel", name: "Deploy to Vercel", description: "Trigger a new deployment from source code." },
      { id: "get_deployment_build_logs", name: "Get Build Logs", description: "Stream build output and error logs for any deployment." },
      { id: "get_runtime_logs", name: "Get Runtime Logs", description: "Fetch serverless function runtime logs." },
      { id: "check_domain_availability", name: "Check Domain Availability", description: "Check if a domain is available and get pricing." },
      { id: "list_teams", name: "List Teams", description: "View all teams your account has access to." },
    ],
  },
  {
    id: "notion",
    name: "Notion",
    tagline: "Notes, docs & databases",
    description: "Create pages, manage databases, add comments, search your workspace, and sync content programmatically.",
    icon: FileText,
    iconColor: "#ffffff",
    category: "productivity",
    docsUrl: "https://developers.notion.com",
    configFields: [
      { key: "notion_token", label: "Notion Integration Token", type: "password", placeholder: "secret_••••", required: true },
    ],
    tools: [
      { id: "notion_search", name: "Search", description: "Full-text search across your Notion workspace.", params: [{ name: "query", type: "string", required: true, description: "Search query" }] },
      { id: "notion_fetch", name: "Fetch Page", description: "Read full content of any Notion page or database." },
      { id: "notion_create_pages", name: "Create Pages", description: "Create new pages with rich content (headings, lists, code blocks)." },
      { id: "notion_update_page", name: "Update Page", description: "Edit page content, title, or properties." },
      { id: "notion_create_database", name: "Create Database", description: "Create a new Notion database with custom schema." },
      { id: "notion_create_comment", name: "Create Comment", description: "Add comments to pages or inline on selected text." },
      { id: "notion_get_comments", name: "Get Comments", description: "Fetch all comments on a page or block." },
      { id: "notion_duplicate_page", name: "Duplicate Page", description: "Clone a page with all its content." },
      { id: "notion_move_pages", name: "Move Pages", description: "Reorganize pages within the workspace hierarchy." },
      { id: "notion_get_users", name: "Get Users", description: "List all workspace members and their roles." },
    ],
  },
  {
    id: "gmail",
    name: "Gmail",
    tagline: "Email search & drafts",
    description: "Search threads, create drafts, manage labels, and read email content via the Gmail API.",
    icon: Mail,
    iconColor: "#ef4444",
    category: "email",
    docsUrl: "https://developers.google.com/gmail/api",
    configFields: [
      { key: "gmail_client_id", label: "Google OAuth Client ID", type: "text", placeholder: "xxxx.apps.googleusercontent.com", required: true },
      { key: "gmail_client_secret", label: "Client Secret", type: "password", placeholder: "GOCSPX-••••", required: true },
    ],
    tools: [
      { id: "search_threads", name: "Search Threads", description: "Search Gmail using advanced query syntax (from:, subject:, has:, etc.).", params: [{ name: "query", type: "string", required: true, description: "Gmail search query" }] },
      { id: "get_thread", name: "Get Thread", description: "Read full email thread with all replies and metadata." },
      { id: "create_draft", name: "Create Draft", description: "Create a new email draft with HTML or plain text body." },
      { id: "list_drafts", name: "List Drafts", description: "Browse all saved email drafts." },
      { id: "list_labels", name: "List Labels", description: "Get all Gmail labels (folders) in the mailbox." },
      { id: "create_label", name: "Create Label", description: "Create a new Gmail label for organization." },
    ],
  },
  {
    id: "google_calendar",
    name: "Google Calendar",
    tagline: "Schedule & events",
    description: "Create, update and manage calendar events, check availability, and suggest meeting times.",
    icon: Calendar,
    iconColor: "#4285f4",
    category: "productivity",
    docsUrl: "https://developers.google.com/calendar",
    configFields: [
      { key: "gcal_client_id", label: "Google OAuth Client ID", type: "text", placeholder: "xxxx.apps.googleusercontent.com", required: true },
      { key: "gcal_client_secret", label: "Client Secret", type: "password", placeholder: "GOCSPX-••••", required: true },
    ],
    tools: [
      { id: "list_calendars", name: "List Calendars", description: "Get all calendars the user has access to." },
      { id: "list_events", name: "List Events", description: "Fetch events within a date range with filtering.", params: [{ name: "calendar_id", type: "string", required: true, description: "Calendar ID" }, { name: "time_min", type: "string", required: false, description: "Start datetime (ISO 8601)" }] },
      { id: "create_event", name: "Create Event", description: "Schedule a new event with attendees, location, and recurrence." },
      { id: "update_event", name: "Update Event", description: "Modify event details, time, attendees, or description." },
      { id: "delete_event", name: "Delete Event", description: "Cancel or permanently delete a calendar event." },
      { id: "respond_to_event", name: "Respond to Event", description: "Accept, decline, or mark tentative on an event invitation." },
      { id: "suggest_time", name: "Suggest Time", description: "Find mutually available meeting slots using free/busy data." },
    ],
  },
  {
    id: "canva",
    name: "Canva",
    tagline: "Design & visual content",
    description: "Create designs, export assets, manage brand kits, perform editing operations, and search your Canva workspace.",
    icon: Palette,
    iconColor: "#00c4cc",
    category: "design",
    docsUrl: "https://www.canva.com/developers",
    configFields: [
      { key: "canva_client_id", label: "Canva App Client ID", type: "text", placeholder: "OC-••••", required: true },
      { key: "canva_client_secret", label: "Client Secret", type: "password", placeholder: "••••••••••", required: true },
    ],
    tools: [
      { id: "generate_design", name: "Generate Design", description: "Create a new design from a text description using AI." },
      { id: "get_design", name: "Get Design", description: "Retrieve design metadata and thumbnail." },
      { id: "get_design_content", name: "Get Design Content", description: "Read all elements and layers inside a design." },
      { id: "export_design", name: "Export Design", description: "Export design as PNG, PDF, MP4, or other formats." },
      { id: "search_designs", name: "Search Designs", description: "Search your Canva workspace for existing designs." },
      { id: "perform_editing_operations", name: "Editing Operations", description: "Programmatically edit text, images, and elements." },
      { id: "resize_design", name: "Resize Design", description: "Resize a design to different dimensions or formats." },
      { id: "list_brand_kits", name: "List Brand Kits", description: "Access brand colors, fonts, and logos." },
      { id: "upload_asset_from_url", name: "Upload Asset", description: "Import images or files from a URL into your Canva library." },
      { id: "merge_designs", name: "Merge Designs", description: "Combine multiple designs into one." },
    ],
  },
  {
    id: "buffer",
    name: "Buffer",
    tagline: "Social media scheduling",
    description: "Schedule social media posts, manage channels, create ideas, and track publishing queues across platforms.",
    icon: Share2,
    iconColor: "#2c4bff",
    category: "social",
    docsUrl: "https://buffer.com/developers",
    configFields: [
      { key: "buffer_token", label: "Buffer Access Token", type: "password", placeholder: "••••••••••••••••••••••••", required: true },
    ],
    tools: [
      { id: "get_account", name: "Get Account", description: "Fetch Buffer account details and connected channels." },
      { id: "list_channels", name: "List Channels", description: "View all connected social media channels." },
      { id: "get_channel", name: "Get Channel", description: "Get posting queue and stats for a specific channel." },
      { id: "list_posts", name: "List Posts", description: "Browse scheduled and published posts." },
      { id: "create_post", name: "Create Post", description: "Schedule a new post to one or more social channels.", params: [{ name: "text", type: "string", required: true, description: "Post content" }, { name: "channel_ids", type: "array", required: true, description: "Target channel IDs" }] },
      { id: "get_post", name: "Get Post", description: "Retrieve a specific post and its analytics." },
      { id: "delete_post", name: "Delete Post", description: "Remove a scheduled or published post." },
      { id: "create_idea", name: "Create Idea", description: "Save a content idea to the Buffer ideas library." },
    ],
  },
  {
    id: "gsc",
    name: "Google Search Console",
    tagline: "SEO & search performance",
    description: "Pull search analytics data, manage sitemaps, track keyword rankings, and monitor site performance in Google Search.",
    icon: Search,
    iconColor: "#4285f4",
    category: "seo",
    docsUrl: "https://developers.google.com/webmaster-tools",
    configFields: [
      { key: "gsc_client_id", label: "Google OAuth Client ID", type: "text", placeholder: "xxxx.apps.googleusercontent.com", required: true },
      { key: "gsc_client_secret", label: "Client Secret", type: "password", placeholder: "GOCSPX-••••", required: true },
    ],
    tools: [
      { id: "list_gsc_sites", name: "List Sites", description: "Get all properties verified in Search Console." },
      { id: "get_search_analytics", name: "Get Search Analytics", description: "Pull clicks, impressions, CTR, and rankings data.", params: [{ name: "site_url", type: "string", required: true, description: "Property URL" }, { name: "start_date", type: "string", required: true, description: "Start date (YYYY-MM-DD)" }, { name: "dimensions", type: "array", required: false, description: "Group by: query, page, country, device" }] },
      { id: "get_sitemaps", name: "Get Sitemaps", description: "View all submitted sitemaps and their indexing status." },
      { id: "submit_sitemap", name: "Submit Sitemap", description: "Submit a new sitemap URL for indexing." },
      { id: "delete_sitemap", name: "Delete Sitemap", description: "Remove a previously submitted sitemap." },
      { id: "list_available_dimensions", name: "List Dimensions", description: "View all available analytics dimensions." },
      { id: "list_available_metrics", name: "List Metrics", description: "View all available performance metrics." },
    ],
  },
  {
    id: "dataforseo",
    name: "DataForSEO",
    tagline: "SEO data & keyword research",
    description: "Keyword research, SERP analysis, backlink data, competitor research, and on-page audits via the DataForSEO API.",
    icon: BarChart2,
    iconColor: "#f59e0b",
    category: "seo",
    docsUrl: "https://docs.dataforseo.com",
    configFields: [
      { key: "dataforseo_login", label: "API Login", type: "text", placeholder: "your@email.com", required: true },
      { key: "dataforseo_password", label: "API Password", type: "password", placeholder: "••••••••", required: true },
    ],
    tools: [
      { id: "kw_overview", name: "Keyword Overview", description: "Search volume, difficulty, CPC, and trends for any keyword." },
      { id: "kw_ideas", name: "Keyword Ideas", description: "Generate related keyword suggestions from a seed keyword." },
      { id: "kw_suggestions", name: "Keyword Suggestions", description: "Autocomplete-style keyword suggestions." },
      { id: "serp_organic", name: "SERP Organic Results", description: "Fetch live Google search results for any query." },
      { id: "backlinks_summary", name: "Backlinks Summary", description: "Domain-level backlink metrics: DR, DA, total links." },
      { id: "backlinks_referring_domains", name: "Referring Domains", description: "List all domains linking to a target URL." },
      { id: "domain_rank_overview", name: "Domain Rank Overview", description: "Domain authority, traffic estimates, and keyword rankings." },
      { id: "competitors_domain", name: "Competitors", description: "Discover organic search competitors for any domain." },
      { id: "on_page_lighthouse", name: "Lighthouse Audit", description: "Run a full Lighthouse performance and SEO audit." },
      { id: "search_intent", name: "Search Intent", description: "Classify keyword intent: informational, commercial, transactional." },
    ],
  },
  {
    id: "apify",
    name: "Apify",
    tagline: "Web scraping & automation",
    description: "Run web scrapers, access the Apify actor library, extract structured data from any website, and build automated pipelines.",
    icon: Code2,
    iconColor: "#1cff8e",
    category: "data",
    docsUrl: "https://docs.apify.com",
    configFields: [
      { key: "apify_token", label: "Apify API Token", type: "password", placeholder: "apify_api_••••", required: true },
    ],
    tools: [
      { id: "rag_web_browser", name: "RAG Web Browser", description: "Scrape and extract clean markdown content from any URL for AI context." },
      { id: "call_actor", name: "Call Actor", description: "Run any Apify actor with custom input and wait for results.", params: [{ name: "actor_id", type: "string", required: true, description: "Actor ID or name" }, { name: "input", type: "object", required: false, description: "Actor input JSON" }] },
      { id: "search_actors", name: "Search Actors", description: "Browse the Apify Store for ready-made web scrapers." },
      { id: "fetch_actor_details", name: "Fetch Actor Details", description: "Get actor documentation, input schema, and pricing." },
      { id: "get_actor_run", name: "Get Actor Run", description: "Check run status, progress, and output." },
      { id: "get_actor_output", name: "Get Actor Output", description: "Download structured data from a completed run." },
    ],
  },
  {
    id: "browser_automation",
    name: "Browser Automation",
    tagline: "Headless browser control",
    description: "Automate Chrome or any browser: navigate, click, fill forms, take screenshots, read console logs, and execute JavaScript.",
    icon: Globe2,
    iconColor: "#fbbc05",
    category: "browser",
    docsUrl: "https://playwright.dev",
    configFields: [],
    tools: [
      { id: "navigate", name: "Navigate", description: "Open any URL in the browser.", params: [{ name: "url", type: "string", required: true, description: "Target URL" }] },
      { id: "screenshot", name: "Screenshot", description: "Capture a full-page or viewport screenshot." },
      { id: "click", name: "Click Element", description: "Click on any DOM element by CSS selector." },
      { id: "fill", name: "Fill Input", description: "Type text into any form field." },
      { id: "get_page_text", name: "Get Page Text", description: "Extract all visible text content from the current page." },
      { id: "read_console_messages", name: "Read Console Logs", description: "Capture browser console output including errors." },
      { id: "execute_javascript", name: "Execute JavaScript", description: "Run arbitrary JS in the browser context and return results." },
      { id: "read_network_requests", name: "Read Network Requests", description: "Inspect HTTP requests made by the page." },
      { id: "list_tabs", name: "List Tabs", description: "View all open browser tabs." },
      { id: "dom", name: "Get DOM", description: "Access and traverse the full DOM structure." },
    ],
  },
  {
    id: "desktop_commander",
    name: "Desktop Commander",
    tagline: "System & file automation",
    description: "Control your desktop: manage files, run processes, start shell commands, list running processes, and interact with system resources.",
    icon: Terminal,
    iconColor: "#a855f7",
    category: "browser",
    docsUrl: "",
    configFields: [],
    tools: [
      { id: "list_directory", name: "List Directory", description: "Browse files and directories on the local filesystem." },
      { id: "read_file", name: "Read File", description: "Read file contents with optional line offset and limit." },
      { id: "write_file", name: "Write File", description: "Create or overwrite a file with new content." },
      { id: "edit_block", name: "Edit Block", description: "Make targeted text replacements within a file." },
      { id: "start_process", name: "Start Process", description: "Launch a new shell command or background process.", params: [{ name: "command", type: "string", required: true, description: "Shell command to run" }] },
      { id: "list_processes", name: "List Processes", description: "Show all running processes with PID and CPU/memory." },
      { id: "kill_process", name: "Kill Process", description: "Terminate a process by PID." },
      { id: "interact_with_process", name: "Interact with Process", description: "Send stdin input to a running interactive process." },
      { id: "create_directory", name: "Create Directory", description: "Create a new directory and any parent directories." },
      { id: "move_file", name: "Move File", description: "Move or rename a file or directory." },
    ],
  },
  {
    id: "pdf_tools",
    name: "PDF Tools",
    tagline: "PDF read, fill & merge",
    description: "Read, fill, merge, split, rotate, reorder pages, extract data to CSV, and bulk-fill PDF forms from spreadsheet data.",
    icon: FileText,
    iconColor: "#ef4444",
    category: "productivity",
    docsUrl: "",
    configFields: [],
    tools: [
      { id: "read_pdf_content", name: "Read PDF Content", description: "Extract all text content from a PDF file." },
      { id: "fill_pdf", name: "Fill PDF", description: "Fill form fields in a PDF with provided data." },
      { id: "merge_pdfs", name: "Merge PDFs", description: "Combine multiple PDF files into one." },
      { id: "split_pdf", name: "Split PDF", description: "Split a PDF into separate files by page range." },
      { id: "extract_to_csv", name: "Extract to CSV", description: "Extract form data from PDF to CSV format." },
      { id: "get_pdf_info", name: "Get PDF Info", description: "Get metadata: page count, author, creation date." },
      { id: "rotate_pdf_pages", name: "Rotate Pages", description: "Rotate specific pages within a PDF." },
      { id: "reorder_pdf_pages", name: "Reorder Pages", description: "Rearrange pages in any order." },
    ],
  },
];

const CATEGORY_LABELS: Record<Category, string> = {
  ai: "AI & Language Models",
  database: "Database",
  email: "Email",
  deployment: "Deployment",
  productivity: "Productivity",
  design: "Design",
  seo: "SEO & Marketing",
  browser: "Browser & Automation",
  social: "Social Media",
  data: "Data & Scraping",
};

const CATEGORY_COLORS: Record<Category, string> = {
  ai: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  database: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  email: "bg-red-500/15 text-red-300 border-red-500/30",
  deployment: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  productivity: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  design: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  seo: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  browser: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  social: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  data: "bg-lime-500/15 text-lime-300 border-lime-500/30",
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_COLORS[category]}`}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

function ConnectionDot({ connected }: { connected: boolean }) {
  return (
    <span className={`inline-flex h-2 w-2 rounded-full ${connected ? "bg-[var(--success)]" : "bg-[var(--border)]"}`} />
  );
}

function PlatformCard({
  platform,
  onSelect,
  isSelected,
}: {
  platform: MCPPlatform;
  onSelect: (p: MCPPlatform) => void;
  isSelected: boolean;
}) {
  const Icon = platform.icon;
  return (
    <button
      onClick={() => onSelect(platform)}
      className={`group w-full text-left rounded-xl border p-4 transition-all duration-200 ${
        isSelected
          ? "border-[var(--accent)] bg-[var(--accent)]/10 shadow-lg shadow-[var(--accent)]/10"
          : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/50 hover:bg-[var(--surface-2)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${platform.iconColor}20`, border: `1px solid ${platform.iconColor}40` }}
          >
            <Icon className="h-5 w-5" style={{ color: platform.iconColor }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">{platform.name}</p>
              {platform.featured && <Star className="h-3 w-3 text-[var(--warning)] fill-[var(--warning)]" />}
            </div>
            <p className="text-xs text-[var(--muted)]">{platform.tagline}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <CategoryBadge category={platform.category} />
          <span className="text-[10px] text-[var(--muted)]">{platform.tools.length} tools</span>
        </div>
      </div>
    </button>
  );
}

function ToolRow({ tool, expanded, onToggle }: { tool: MCPTool; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border border-[var(--border)] overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Wrench className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">{tool.name}</p>
            <p className="text-xs text-[var(--muted)]">{tool.description}</p>
          </div>
        </div>
        {tool.params ? (
          expanded ? <ChevronDown className="h-4 w-4 text-[var(--muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)]" />
        ) : null}
      </button>
      {expanded && tool.params && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Parameters</p>
          <div className="space-y-2">
            {tool.params.map((p) => (
              <div key={p.name} className="flex items-start gap-3">
                <code className="shrink-0 rounded bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--accent)] font-mono">
                  {p.name}
                </code>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[var(--muted)] font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded">
                    {p.type}
                  </span>
                  {p.required && (
                    <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                      required
                    </span>
                  )}
                  <span className="text-xs text-[var(--muted)]">{p.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlatformDetailPanel({ platform, onBack }: { platform: MCPPlatform; onBack: () => void }) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const Icon = platform.icon;

  function togglePassword(key: string) {
    setShowPasswords((p) => ({ ...p, [key]: !p[key] }));
  }

  function copyValue(key: string) {
    const val = config[key];
    if (val) {
      navigator.clipboard.writeText(val);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ← All Platforms
        </button>
      </div>

      <div className="flex items-start gap-4">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${platform.iconColor}20`, border: `1px solid ${platform.iconColor}40` }}
        >
          <Icon className="h-6 w-6" style={{ color: platform.iconColor }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--foreground)]">{platform.name}</h2>
            {platform.featured && <Star className="h-4 w-4 text-[var(--warning)] fill-[var(--warning)]" />}
            <CategoryBadge category={platform.category} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">{platform.description}</p>
          {platform.docsUrl && (
            <a
              href={platform.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              <ExternalLink className="h-3 w-3" />
              View Documentation
            </a>
          )}
        </div>
      </div>

      {/* Config panel */}
      {platform.configFields.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plug className="h-4 w-4 text-[var(--accent)]" />
              <CardTitle>Connect {platform.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {platform.configFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label>
                    {field.label}
                    {field.required && <span className="ml-1 text-[var(--danger)]">*</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      type={field.type === "password" && !showPasswords[field.key] ? "password" : "text"}
                      placeholder={field.placeholder}
                      value={config[field.key] ?? ""}
                      onChange={(e) => setConfig((c) => ({ ...c, [field.key]: e.target.value }))}
                      className="pr-16"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
                      {field.type === "password" && (
                        <button
                          type="button"
                          onClick={() => togglePassword(field.key)}
                          className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                          {showPasswords[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {config[field.key] && (
                        <button
                          type="button"
                          onClick={() => copyValue(field.key)}
                          className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]"
                        >
                          {copied === field.key ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-1">
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                Save Connection
              </Button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-[var(--success)]">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
              <Shield className="h-4 w-4 shrink-0 text-[var(--muted)] mt-0.5" />
              <p className="text-xs text-[var(--muted)]">
                API keys are stored in your browser&apos;s local storage and never sent to our servers. For production use, store them in your environment variables (.env.local).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools list */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Available Tools</h3>
          <span className="ml-auto text-xs text-[var(--muted)]">{platform.tools.length} tools</span>
        </div>
        {platform.tools.map((tool) => (
          <ToolRow
            key={tool.id}
            tool={tool}
            expanded={expandedTool === tool.id}
            onToggle={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ToolExplorer() {
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState<Category | "all">("all");
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const allTools = useMemo(() => {
    return PLATFORMS.flatMap((p) =>
      p.tools.map((t) => ({ ...t, platformName: p.name, platformId: p.id, category: p.category, iconColor: p.iconColor, icon: p.icon }))
    );
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allTools.filter((t) => {
      const catMatch = filterCat === "all" || t.category === filterCat;
      const textMatch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.platformName.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [allTools, query, filterCat]);

  const totalTools = allTools.length;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Platforms", value: PLATFORMS.length, icon: Plug },
          { label: "Total Tools", value: totalTools, icon: Wrench },
          { label: "Categories", value: Object.keys(CATEGORY_LABELS).length, icon: LayoutTemplate },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
            <Icon className="h-5 w-5 text-[var(--accent)] mx-auto mb-1" />
            <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
            <p className="text-xs text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
          <Input
            placeholder="Search tools by name, description, or platform…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value as Category | "all")}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm px-3 py-2 text-[var(--foreground)]"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-[var(--muted)]">
        Showing {filtered.length} of {totalTools} tools
        {query && ` matching "${query}"`}
        {filterCat !== "all" && ` in ${CATEGORY_LABELS[filterCat]}`}
      </p>

      {/* Tool rows */}
      <div className="space-y-2">
        {filtered.map((tool) => {
          const PlatIcon = tool.icon;
          const uid = `${tool.platformId}__${tool.id}`;
          return (
            <div key={uid} className="rounded-xl border border-[var(--border)] overflow-hidden">
              <button
                onClick={() => setExpandedTool(expandedTool === uid ? null : uid)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors"
              >
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${tool.iconColor}20` }}
                >
                  <PlatIcon className="h-3.5 w-3.5" style={{ color: tool.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--foreground)]">{tool.name}</span>
                    <span className="text-[10px] text-[var(--muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      {tool.platformName}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted)] truncate">{tool.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CategoryBadge category={tool.category} />
                  {tool.params && (expandedTool === uid ? <ChevronDown className="h-4 w-4 text-[var(--muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)]" />)}
                </div>
              </button>
              {expandedTool === uid && tool.params && (
                <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Parameters</p>
                  {tool.params.map((p) => (
                    <div key={p.name} className="flex items-start gap-3">
                      <code className="shrink-0 rounded bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--accent)] font-mono">{p.name}</code>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] text-[var(--muted)] font-mono bg-[var(--surface)] px-1.5 py-0.5 rounded">{p.type}</span>
                        {p.required && <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">required</span>}
                        <span className="text-xs text-[var(--muted)]">{p.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <Search className="h-8 w-8 text-[var(--border)] mx-auto mb-3" />
            <p className="text-sm text-[var(--muted)]">No tools match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InstructionsPanel() {
  const steps = [
    {
      icon: Plug,
      title: "1. Connect a Platform",
      desc: "Go to the Platforms tab, select a platform, and enter your API credentials. Keys are stored securely in your environment.",
      color: "text-[var(--accent)]",
    },
    {
      icon: Wrench,
      title: "2. Explore Available Tools",
      desc: "Each connected platform exposes a set of tools. Use the Tool Explorer tab to search all 100+ tools by name, description, or category.",
      color: "text-emerald-400",
    },
    {
      icon: Bot,
      title: "3. Use Tools in Claude Code",
      desc: "Connected MCP tools appear automatically in Claude Code. Type a natural language request and Claude will select and call the right tool.",
      color: "text-purple-400",
    },
    {
      icon: Sparkles,
      title: "4. Combine Tools for Workflows",
      desc: "Chain multiple tools together: scrape a website → analyze with Claude → save to Supabase → post results to Buffer.",
      color: "text-amber-400",
    },
  ];

  const codeExamples = [
    {
      title: "AI Email Generation (OpenRouter)",
      code: `// Already wired into PixelReach campaigns
const response = await openai.chat.completions.create({
  model: "anthropic/claude-sonnet-4-6",
  messages: [{ role: "user", content: emailPrompt }]
});`,
    },
    {
      title: "Database Query (Supabase)",
      code: `// Execute SQL via MCP tool
execute_sql({
  project_id: "your-project-id",
  query: "SELECT * FROM leads WHERE status = 'new' LIMIT 100"
})`,
    },
    {
      title: "Keyword Research (DataForSEO)",
      code: `// Get keyword data
dataforseo_labs_google_keyword_overview({
  keywords: ["email marketing software"],
  location_code: 2840  // United States
})`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-[var(--accent)]" />
          <p className="text-sm font-semibold text-[var(--foreground)]">What is MCP (Model Context Protocol)?</p>
        </div>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          MCP is an open standard by Anthropic that lets AI models like Claude connect to external tools, databases, APIs, and services.
          Instead of hardcoding integrations, MCP lets Claude discover and call tools dynamically — turning it from a chatbot into an
          autonomous agent that can read databases, browse the web, write files, post to social media, and much more.
        </p>
      </div>

      {/* Steps */}
      <div className="grid gap-4 sm:grid-cols-2">
        {steps.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Code examples */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Code Examples</h3>
        </div>
        {codeExamples.map(({ title, code }) => (
          <div key={title} className="rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center gap-2 bg-[var(--surface-2)] px-4 py-2.5 border-b border-[var(--border)]">
              <Code2 className="h-3.5 w-3.5 text-[var(--accent)]" />
              <p className="text-xs font-medium text-[var(--foreground)]">{title}</p>
            </div>
            <pre className="p-4 overflow-x-auto text-xs text-emerald-300 font-mono leading-relaxed bg-[var(--surface)]">
              <code>{code}</code>
            </pre>
          </div>
        ))}
      </div>

      {/* Quick reference */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[var(--accent)]" />
            <CardTitle>Quick Reference</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {PLATFORMS.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.id} className="flex items-center gap-2.5 py-1.5">
                  <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: p.iconColor }} />
                  <span className="text-sm text-[var(--foreground)]">{p.name}</span>
                  <span className="ml-auto text-xs text-[var(--muted)]">{p.tools.length} tools</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function MCPToolsClient() {
  const [selectedPlatform, setSelectedPlatform] = useState<MCPPlatform | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPlatforms = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return PLATFORMS;
    return PLATFORMS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        CATEGORY_LABELS[p.category].toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Plug className="h-5 w-5 text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--foreground)]">MCP Connect</h1>
            <span className="rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
              Beta
            </span>
          </div>
          <p className="text-sm text-[var(--muted)]">
            Connect {PLATFORMS.length} platforms · {PLATFORMS.reduce((s, p) => s + p.tools.length, 0)} tools available via Model Context Protocol
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConnectionDot connected={false} />
          <span className="text-xs text-[var(--muted)]">{PLATFORMS.length} platforms</span>
        </div>
      </div>

      <Tabs defaultValue="platforms">
        <TabsList className="mb-5">
          <TabsTrigger value="platforms">
            <Plug className="h-3.5 w-3.5 mr-1.5" />
            Platforms
          </TabsTrigger>
          <TabsTrigger value="explorer">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Tool Explorer
          </TabsTrigger>
          <TabsTrigger value="instructions">
            <BookOpen className="h-3.5 w-3.5 mr-1.5" />
            How It Works
          </TabsTrigger>
        </TabsList>

        {/* ── Platforms Tab ── */}
        <TabsContent value="platforms">
          {selectedPlatform ? (
            <PlatformDetailPanel platform={selectedPlatform} onBack={() => setSelectedPlatform(null)} />
          ) : (
            <div className="space-y-4">
              {/* Featured */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-[var(--warning)] fill-[var(--warning)]" />
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Featured & Integrated</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PLATFORMS.filter((p) => p.featured).map((p) => (
                    <PlatformCard key={p.id} platform={p} onSelect={setSelectedPlatform} isSelected={false} />
                  ))}
                </div>
              </div>

              {/* All platforms */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">All Platforms</p>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
                    <Input
                      placeholder="Filter platforms…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPlatforms.map((p) => (
                    <PlatformCard key={p.id} platform={p} onSelect={setSelectedPlatform} isSelected={false} />
                  ))}
                  {filteredPlatforms.length === 0 && (
                    <div className="col-span-3 py-10 text-center">
                      <p className="text-sm text-[var(--muted)]">No platforms match &quot;{searchQuery}&quot;</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tool Explorer Tab ── */}
        <TabsContent value="explorer">
          <ToolExplorer />
        </TabsContent>

        {/* ── Instructions Tab ── */}
        <TabsContent value="instructions">
          <InstructionsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
