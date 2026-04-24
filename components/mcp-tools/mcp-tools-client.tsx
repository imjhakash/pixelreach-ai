"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Bot, Database, Globe, Mail, LayoutTemplate, Calendar, Search,
  Palette, Share2, BarChart2, FileText, Code2, Cpu, Globe2,
  Terminal, ChevronRight, ChevronDown, Loader2,
  Plug, ExternalLink, Wrench, Star,
  Shield, Eye, EyeOff, Copy, CheckCircle2, BookOpen,
  Play, RotateCcw, Check, X, Wifi, WifiOff, AlertCircle,
  Zap, Brackets, Settings2, ArrowLeft, Download, MonitorDot,
  FlaskConical, ArrowUpRight, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ─── Types ────────────────────────────────────────────────────────────────────
type ToolParam = { name: string; type: string; required: boolean; description: string };
type MCPTool  = { id: string; name: string; description: string; params?: ToolParam[] };
type Category = "ai" | "database" | "email" | "deployment" | "productivity" | "design" | "seo" | "browser" | "social" | "data";
type ConfigField = { key: string; label: string; type: "text" | "password" | "url"; placeholder: string; required: boolean };
type TestStatus = "idle" | "testing" | "ok" | "fail";

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
  mcpPackage?: string;     // official npm MCP server package
  mcpEnvMap?: Record<string, string>; // envVar → configField key
  featured?: boolean;
  canTest?: boolean;
};

// ─── Platform Catalog ─────────────────────────────────────────────────────────
const PLATFORMS: MCPPlatform[] = [
  {
    id: "anthropic", name: "Claude / Anthropic", tagline: "AI core engine",
    description: "Connect Anthropic Claude models for text generation, tool use, vision, streaming, and multi-step agents.",
    icon: Bot, iconColor: "#6366f1", category: "ai", featured: true, canTest: true,
    docsUrl: "https://docs.anthropic.com",
    mcpPackage: "@anthropic-ai/claude-code",
    mcpEnvMap: { ANTHROPIC_API_KEY: "anthropic_api_key" },
    configFields: [
      { key: "anthropic_api_key", label: "Anthropic API Key", type: "password", placeholder: "sk-ant-api03-••••", required: true },
      { key: "anthropic_model", label: "Default Model", type: "text", placeholder: "claude-sonnet-4-6", required: false },
    ],
    tools: [
      { id: "messages", name: "Messages API", description: "Send and receive messages from Claude with tool use, vision, and streaming.", params: [{ name: "model", type: "string", required: true, description: "Claude model ID (e.g. claude-sonnet-4-6)" }, { name: "messages", type: "array", required: true, description: "Chat messages array" }, { name: "tools", type: "array", required: false, description: "Tool definitions for function calling" }, { name: "max_tokens", type: "number", required: false, description: "Max output tokens (default: 1024)" }] },
      { id: "tool_use", name: "Tool Use / Function Calling", description: "Let Claude call your custom functions and external APIs intelligently." },
      { id: "vision", name: "Vision / Image Analysis", description: "Analyze images, PDFs, and screenshots inline in conversations." },
      { id: "streaming", name: "Streaming Responses", description: "Stream Claude output token-by-token for real-time UX." },
      { id: "batch", name: "Batch Processing API", description: "Process up to 100k requests asynchronously at 50% cost." },
      { id: "prompt_caching", name: "Prompt Caching", description: "Cache up to 1M tokens of context to reduce latency and cost by 90%." },
      { id: "files_api", name: "Files API", description: "Upload and reference PDFs, images, text files in conversations." },
      { id: "citations", name: "Citations", description: "Get grounded source citations from your uploaded documents." },
    ],
  },
  {
    id: "openrouter", name: "OpenRouter", tagline: "200+ AI models via one API",
    description: "Access GPT-4o, Gemini 2.5, Llama 4, Mistral and 200+ models via a single OpenAI-compatible API endpoint.",
    icon: Cpu, iconColor: "#8b5cf6", category: "ai", featured: true, canTest: true,
    docsUrl: "https://openrouter.ai/docs",
    mcpPackage: undefined,
    mcpEnvMap: { OPENROUTER_API_KEY: "openrouter_api_key" },
    configFields: [
      { key: "openrouter_api_key", label: "OpenRouter API Key", type: "password", placeholder: "sk-or-v1-••••", required: true },
    ],
    tools: [
      { id: "chat_completion", name: "Chat Completion", description: "Generate text using any model via unified API.", params: [{ name: "model", type: "string", required: true, description: "Model ID (e.g. openai/gpt-4o)" }, { name: "content", type: "string", required: true, description: "User message" }] },
      { id: "analyze_image", name: "Analyze Image", description: "Vision analysis with multimodal models like GPT-4o." },
      { id: "analyze_audio", name: "Analyze Audio", description: "Audio transcription and understanding." },
      { id: "generate_image", name: "Generate Image", description: "Create images with DALL-E 3, Flux, Stable Diffusion." },
      { id: "generate_video", name: "Generate Video", description: "AI video generation via Runway, Kling, Sora." },
      { id: "get_model_info", name: "Get Model Info", description: "Fetch pricing, context window, capabilities for any model.", params: [{ name: "model", type: "string", required: true, description: "Model ID to look up" }] },
      { id: "search_models", name: "Search Models", description: "Find models by capability, cost, or context window.", params: [{ name: "query", type: "string", required: false, description: "Search query (e.g. 'vision 128k')" }] },
    ],
  },
  {
    id: "supabase", name: "Supabase", tagline: "Postgres + auth + storage",
    description: "Manage your Postgres DB: execute SQL, run migrations, deploy edge functions, inspect tables, and view logs.",
    icon: Database, iconColor: "#22c55e", category: "database", featured: true, canTest: true,
    docsUrl: "https://supabase.com/docs",
    mcpPackage: "@supabase/mcp-server-supabase@latest",
    mcpEnvMap: { SUPABASE_ACCESS_TOKEN: "supabase_service_key" },
    configFields: [
      { key: "supabase_url", label: "Project URL", type: "url", placeholder: "https://xxxx.supabase.co", required: true },
      { key: "supabase_anon_key", label: "Anon Public Key", type: "password", placeholder: "eyJhbGci••••", required: true },
      { key: "supabase_service_key", label: "Service Role Key", type: "password", placeholder: "eyJhbGci••••", required: false },
    ],
    tools: [
      { id: "execute_sql", name: "Execute SQL", description: "Run arbitrary SQL queries on your Postgres database.", params: [{ name: "query", type: "string", required: true, description: "SQL query to execute" }, { name: "project_id", type: "string", required: true, description: "Supabase project reference ID" }] },
      { id: "list_tables", name: "List Tables", description: "Inspect all tables, columns, types, and constraints." },
      { id: "apply_migration", name: "Apply Migration", description: "Apply a SQL migration file to the database.", params: [{ name: "name", type: "string", required: true, description: "Migration name" }, { name: "query", type: "string", required: true, description: "SQL migration content" }] },
      { id: "list_migrations", name: "List Migrations", description: "View all applied and pending migration history." },
      { id: "deploy_edge_function", name: "Deploy Edge Function", description: "Deploy a Deno edge function to Supabase." },
      { id: "list_edge_functions", name: "List Edge Functions", description: "Browse deployed edge functions and their status." },
      { id: "create_branch", name: "Create Branch", description: "Create a Supabase database branch for isolated development." },
      { id: "generate_typescript_types", name: "Generate TypeScript Types", description: "Auto-generate TS types from your live DB schema." },
      { id: "get_logs", name: "Get Logs", description: "Fetch edge function and API gateway logs." },
      { id: "get_advisors", name: "Security Advisors", description: "Get security and performance advisor recommendations." },
    ],
  },
  {
    id: "vercel", name: "Vercel", tagline: "Deploy & monitor projects",
    description: "Deploy apps, inspect build logs, monitor runtime errors, manage domains and teams on Vercel.",
    icon: Globe, iconColor: "#e2e8f0", category: "deployment", canTest: true,
    docsUrl: "https://vercel.com/docs",
    mcpPackage: "@vercel/mcp-adapter",
    mcpEnvMap: { VERCEL_TOKEN: "vercel_token" },
    configFields: [
      { key: "vercel_token", label: "Vercel API Token", type: "password", placeholder: "••••••••••••••••••••••••", required: true },
      { key: "vercel_team_id", label: "Team ID (optional)", type: "text", placeholder: "team_xxxxxxxxxxxx", required: false },
    ],
    tools: [
      { id: "list_projects", name: "List Projects", description: "Browse all Vercel projects in your account or team." },
      { id: "get_project", name: "Get Project", description: "Inspect project config, domains, and env variables." },
      { id: "list_deployments", name: "List Deployments", description: "View recent deployments with status, URL, and timing." },
      { id: "get_deployment", name: "Get Deployment", description: "Get details for a specific deployment." },
      { id: "deploy_to_vercel", name: "Deploy to Vercel", description: "Trigger a new deployment from source code." },
      { id: "get_deployment_build_logs", name: "Build Logs", description: "Stream build output and error logs." },
      { id: "get_runtime_logs", name: "Runtime Logs", description: "Fetch serverless function runtime logs." },
      { id: "check_domain_availability", name: "Check Domain", description: "Check domain availability and pricing." },
      { id: "list_teams", name: "List Teams", description: "View all teams your account belongs to." },
    ],
  },
  {
    id: "notion", name: "Notion", tagline: "Workspace docs & databases",
    description: "Create pages, update databases, add comments, search your workspace, and sync structured content.",
    icon: FileText, iconColor: "#ffffff", category: "productivity", canTest: true,
    docsUrl: "https://developers.notion.com",
    mcpPackage: "@notionhq/notion-mcp-server",
    mcpEnvMap: { OPENAPI_MCP_HEADERS: "notion_token" },
    configFields: [
      { key: "notion_token", label: "Notion Integration Token", type: "password", placeholder: "secret_••••", required: true },
    ],
    tools: [
      { id: "notion_search", name: "Search", description: "Full-text search across your entire Notion workspace.", params: [{ name: "query", type: "string", required: true, description: "Search query" }] },
      { id: "notion_fetch", name: "Fetch Page", description: "Read full content of any Notion page or database." },
      { id: "notion_create_pages", name: "Create Pages", description: "Create pages with rich blocks: headings, lists, code." },
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
    id: "gmail", name: "Gmail", tagline: "Email search & drafts",
    description: "Search threads, create drafts, manage labels, and read email content via the Gmail API.",
    icon: Mail, iconColor: "#ef4444", category: "email",
    docsUrl: "https://developers.google.com/gmail/api",
    configFields: [
      { key: "gmail_client_id", label: "Google OAuth Client ID", type: "text", placeholder: "xxxx.apps.googleusercontent.com", required: true },
      { key: "gmail_client_secret", label: "Client Secret", type: "password", placeholder: "GOCSPX-••••", required: true },
    ],
    tools: [
      { id: "search_threads", name: "Search Threads", description: "Search Gmail using advanced query syntax.", params: [{ name: "query", type: "string", required: true, description: "Gmail query (e.g. from:user@example.com)" }] },
      { id: "get_thread", name: "Get Thread", description: "Read full email thread with all replies and metadata." },
      { id: "create_draft", name: "Create Draft", description: "Create a new email draft with HTML or plain text body." },
      { id: "list_drafts", name: "List Drafts", description: "Browse all saved email drafts." },
      { id: "list_labels", name: "List Labels", description: "Get all Gmail labels (folders) in the mailbox." },
      { id: "create_label", name: "Create Label", description: "Create a new Gmail label for organization." },
    ],
  },
  {
    id: "google_calendar", name: "Google Calendar", tagline: "Events & scheduling",
    description: "Create, update, and manage calendar events, check availability, and suggest meeting times.",
    icon: Calendar, iconColor: "#4285f4", category: "productivity",
    docsUrl: "https://developers.google.com/calendar",
    configFields: [
      { key: "gcal_client_id", label: "Google OAuth Client ID", type: "text", placeholder: "xxxx.apps.googleusercontent.com", required: true },
      { key: "gcal_client_secret", label: "Client Secret", type: "password", placeholder: "GOCSPX-••••", required: true },
    ],
    tools: [
      { id: "list_calendars", name: "List Calendars", description: "Get all calendars the user has access to." },
      { id: "list_events", name: "List Events", description: "Fetch events within a date range.", params: [{ name: "calendar_id", type: "string", required: true, description: "Calendar ID (use 'primary' for main)" }, { name: "time_min", type: "string", required: false, description: "Start datetime ISO 8601" }] },
      { id: "create_event", name: "Create Event", description: "Schedule a new event with attendees and recurrence." },
      { id: "update_event", name: "Update Event", description: "Modify event time, attendees, or description." },
      { id: "delete_event", name: "Delete Event", description: "Cancel or delete a calendar event." },
      { id: "respond_to_event", name: "Respond to Event", description: "Accept, decline, or mark tentative on an invitation." },
      { id: "suggest_time", name: "Suggest Time", description: "Find mutually available slots using free/busy data.", params: [{ name: "attendees", type: "array", required: true, description: "Attendee email addresses" }, { name: "duration_minutes", type: "number", required: true, description: "Meeting duration in minutes" }] },
    ],
  },
  {
    id: "canva", name: "Canva", tagline: "AI-powered design creation",
    description: "Generate designs, export assets, manage brand kits, and perform editing operations programmatically.",
    icon: Palette, iconColor: "#00c4cc", category: "design",
    docsUrl: "https://www.canva.com/developers",
    configFields: [
      { key: "canva_client_id", label: "Canva App Client ID", type: "text", placeholder: "OC-••••", required: true },
      { key: "canva_client_secret", label: "Client Secret", type: "password", placeholder: "••••••••••", required: true },
    ],
    tools: [
      { id: "generate_design", name: "Generate Design", description: "Create a new design from a text description using AI.", params: [{ name: "prompt", type: "string", required: true, description: "Design description" }, { name: "type", type: "string", required: false, description: "Design type: presentation, social_media, etc." }] },
      { id: "get_design", name: "Get Design", description: "Retrieve design metadata and thumbnail." },
      { id: "get_design_content", name: "Get Design Content", description: "Read all elements and layers inside a design." },
      { id: "export_design", name: "Export Design", description: "Export as PNG, PDF, MP4, or other formats." },
      { id: "search_designs", name: "Search Designs", description: "Search your Canva workspace for existing designs." },
      { id: "perform_editing_operations", name: "Editing Operations", description: "Programmatically edit text, images, and elements." },
      { id: "resize_design", name: "Resize Design", description: "Resize a design to different dimensions." },
      { id: "list_brand_kits", name: "List Brand Kits", description: "Access brand colors, fonts, and logos." },
      { id: "upload_asset_from_url", name: "Upload Asset", description: "Import images from a URL into your Canva library." },
      { id: "merge_designs", name: "Merge Designs", description: "Combine multiple designs into one." },
    ],
  },
  {
    id: "buffer", name: "Buffer", tagline: "Social media scheduling",
    description: "Schedule posts, manage channels, create ideas, and track publishing queues across social platforms.",
    icon: Share2, iconColor: "#2c4bff", category: "social", canTest: true,
    docsUrl: "https://buffer.com/developers",
    configFields: [
      { key: "buffer_token", label: "Buffer Access Token", type: "password", placeholder: "••••••••••••••••••••••••", required: true },
    ],
    tools: [
      { id: "get_account", name: "Get Account", description: "Fetch Buffer account details and connected channels." },
      { id: "list_channels", name: "List Channels", description: "View all connected social media channels." },
      { id: "get_channel", name: "Get Channel", description: "Get posting queue and stats for a specific channel." },
      { id: "list_posts", name: "List Posts", description: "Browse scheduled and published posts." },
      { id: "create_post", name: "Create Post", description: "Schedule a post to one or more channels.", params: [{ name: "text", type: "string", required: true, description: "Post content" }, { name: "channel_ids", type: "array", required: true, description: "Target channel IDs" }, { name: "scheduled_at", type: "string", required: false, description: "ISO 8601 scheduled time" }] },
      { id: "get_post", name: "Get Post", description: "Retrieve a specific post and its analytics." },
      { id: "delete_post", name: "Delete Post", description: "Remove a scheduled or published post." },
      { id: "create_idea", name: "Create Idea", description: "Save a content idea to the Buffer ideas library." },
    ],
  },
  {
    id: "gsc", name: "Google Search Console", tagline: "SEO & search performance",
    description: "Pull search analytics, manage sitemaps, track keyword rankings, and monitor Google Search performance.",
    icon: Search, iconColor: "#4285f4", category: "seo",
    docsUrl: "https://developers.google.com/webmaster-tools",
    configFields: [
      { key: "gsc_client_id", label: "Google OAuth Client ID", type: "text", placeholder: "xxxx.apps.googleusercontent.com", required: true },
      { key: "gsc_client_secret", label: "Client Secret", type: "password", placeholder: "GOCSPX-••••", required: true },
    ],
    tools: [
      { id: "list_gsc_sites", name: "List Sites", description: "Get all properties verified in Search Console." },
      { id: "get_search_analytics", name: "Search Analytics", description: "Pull clicks, impressions, CTR, rankings data.", params: [{ name: "site_url", type: "string", required: true, description: "Property URL" }, { name: "start_date", type: "string", required: true, description: "YYYY-MM-DD" }, { name: "end_date", type: "string", required: false, description: "YYYY-MM-DD (default: yesterday)" }, { name: "dimensions", type: "string", required: false, description: "query, page, country, device (comma-separated)" }] },
      { id: "get_sitemaps", name: "Get Sitemaps", description: "View submitted sitemaps and their indexing status." },
      { id: "submit_sitemap", name: "Submit Sitemap", description: "Submit a new sitemap URL for crawling." },
      { id: "delete_sitemap", name: "Delete Sitemap", description: "Remove a previously submitted sitemap." },
    ],
  },
  {
    id: "dataforseo", name: "DataForSEO", tagline: "Keyword research & SERP data",
    description: "Keyword research, SERP analysis, backlink data, competitor research, and on-page audits via REST API.",
    icon: BarChart2, iconColor: "#f59e0b", category: "seo", canTest: true,
    docsUrl: "https://docs.dataforseo.com",
    configFields: [
      { key: "dataforseo_login", label: "API Login (email)", type: "text", placeholder: "your@email.com", required: true },
      { key: "dataforseo_password", label: "API Password", type: "password", placeholder: "••••••••", required: true },
    ],
    tools: [
      { id: "kw_overview", name: "Keyword Overview", description: "Search volume, difficulty, CPC, and trends for any keyword.", params: [{ name: "keywords", type: "string", required: true, description: "Keywords (comma-separated)" }, { name: "location_code", type: "number", required: false, description: "Location code (2840 = US)" }] },
      { id: "kw_ideas", name: "Keyword Ideas", description: "Generate related keyword suggestions from a seed.", params: [{ name: "seed_keyword", type: "string", required: true, description: "Seed keyword to expand" }] },
      { id: "serp_organic", name: "SERP Results", description: "Fetch live Google search results for any query.", params: [{ name: "keyword", type: "string", required: true, description: "Search query" }, { name: "location_name", type: "string", required: false, description: "Location (e.g. United States)" }] },
      { id: "backlinks_summary", name: "Backlinks Summary", description: "Domain-level backlink metrics: DR, DA, total links." },
      { id: "domain_rank_overview", name: "Domain Rank Overview", description: "Authority, traffic estimates, and keyword counts." },
      { id: "competitors_domain", name: "Find Competitors", description: "Discover organic search competitors for any domain." },
      { id: "on_page_lighthouse", name: "Lighthouse Audit", description: "Full Lighthouse performance and SEO audit for any URL." },
      { id: "search_intent", name: "Search Intent", description: "Classify keyword intent: informational, commercial, transactional." },
    ],
  },
  {
    id: "apify", name: "Apify", tagline: "Web scraping & automation",
    description: "Run web scrapers, access 4000+ ready-made actors, extract structured data from any website.",
    icon: Code2, iconColor: "#1cff8e", category: "data", canTest: true,
    docsUrl: "https://docs.apify.com",
    mcpPackage: "apify-mcp-server",
    mcpEnvMap: { APIFY_TOKEN: "apify_token" },
    configFields: [
      { key: "apify_token", label: "Apify API Token", type: "password", placeholder: "apify_api_••••", required: true },
    ],
    tools: [
      { id: "rag_web_browser", name: "RAG Web Browser", description: "Scrape and extract clean markdown from any URL for AI context.", params: [{ name: "url", type: "string", required: true, description: "Target URL to scrape" }, { name: "query", type: "string", required: false, description: "Optional query to focus extraction" }] },
      { id: "call_actor", name: "Call Actor", description: "Run any Apify actor with custom input.", params: [{ name: "actor_id", type: "string", required: true, description: "Actor ID (e.g. apify/web-scraper)" }, { name: "input", type: "object", required: false, description: "Actor input JSON" }] },
      { id: "search_actors", name: "Search Actors", description: "Browse the Apify Store for ready-made scrapers.", params: [{ name: "search", type: "string", required: false, description: "Search term" }] },
      { id: "fetch_actor_details", name: "Actor Details", description: "Get documentation, input schema, and pricing." },
      { id: "get_actor_run", name: "Get Run Status", description: "Check run progress and output." },
      { id: "get_actor_output", name: "Get Run Output", description: "Download structured data from a completed run." },
    ],
  },
  {
    id: "browser_automation", name: "Browser Automation", tagline: "Headless Chrome control",
    description: "Automate any browser: navigate, click, fill forms, take screenshots, execute JS, and read network logs.",
    icon: Globe2, iconColor: "#fbbc05", category: "browser",
    docsUrl: "https://playwright.dev",
    mcpPackage: "@playwright/mcp",
    configFields: [],
    tools: [
      { id: "navigate", name: "Navigate", description: "Open any URL in the browser.", params: [{ name: "url", type: "string", required: true, description: "Target URL" }] },
      { id: "screenshot", name: "Screenshot", description: "Capture a full-page or viewport screenshot." },
      { id: "click", name: "Click Element", description: "Click on any DOM element by CSS selector.", params: [{ name: "selector", type: "string", required: true, description: "CSS selector" }] },
      { id: "fill", name: "Fill Input", description: "Type text into any form field.", params: [{ name: "selector", type: "string", required: true, description: "CSS selector" }, { name: "value", type: "string", required: true, description: "Text to type" }] },
      { id: "get_page_text", name: "Get Page Text", description: "Extract all visible text content from the current page." },
      { id: "read_console_messages", name: "Console Logs", description: "Capture browser console output including errors." },
      { id: "execute_javascript", name: "Execute JavaScript", description: "Run arbitrary JS in browser context and return result.", params: [{ name: "script", type: "string", required: true, description: "JavaScript code to execute" }] },
      { id: "read_network_requests", name: "Network Requests", description: "Inspect all HTTP requests made by the page." },
      { id: "list_tabs", name: "List Tabs", description: "View all open browser tabs." },
      { id: "dom", name: "Get DOM", description: "Access and traverse the full DOM structure." },
    ],
  },
  {
    id: "desktop_commander", name: "Desktop Commander", tagline: "System & file automation",
    description: "Control your desktop: manage files, run shell commands, list processes, and interact with system resources.",
    icon: Terminal, iconColor: "#a855f7", category: "browser",
    docsUrl: "https://github.com/wonderwhy-er/DesktopCommanderMCP",
    mcpPackage: "@wonderwhy-er/desktop-commander",
    configFields: [],
    tools: [
      { id: "list_directory", name: "List Directory", description: "Browse files and directories on the local filesystem.", params: [{ name: "path", type: "string", required: true, description: "Directory path" }] },
      { id: "read_file", name: "Read File", description: "Read file contents with optional line offset and limit." },
      { id: "write_file", name: "Write File", description: "Create or overwrite a file with new content." },
      { id: "edit_block", name: "Edit Block", description: "Make targeted text replacements within a file." },
      { id: "start_process", name: "Start Process", description: "Launch a shell command or background process.", params: [{ name: "command", type: "string", required: true, description: "Shell command to run" }] },
      { id: "list_processes", name: "List Processes", description: "Show running processes with PID, CPU, and memory." },
      { id: "kill_process", name: "Kill Process", description: "Terminate a process by PID." },
      { id: "create_directory", name: "Create Directory", description: "Create a new directory and any parent paths." },
      { id: "move_file", name: "Move File", description: "Move or rename a file or directory." },
      { id: "search_files", name: "Search Files", description: "Full-text search across files in a directory." },
    ],
  },
];

// ─── MCP JSON registry ─────────────────────────────────────────────────────────
type AIClient = {
  id: string; name: string; icon: string; configPath: string; configKey: string;
  description: string; installNote?: string; isMCP: boolean;
};

const AI_CLIENTS: AIClient[] = [
  { id: "claude_desktop", name: "Claude Desktop", icon: "🤖", configPath: "~/Library/Application Support/Claude/claude_desktop_config.json", configKey: "mcpServers", description: "Anthropic's desktop app", isMCP: true },
  { id: "claude_code", name: "Claude Code (CLI)", icon: "⚡", configPath: "~/.claude/settings.json", configKey: "mcpServers", description: "Claude Code terminal CLI", isMCP: true },
  { id: "cursor", name: "Cursor IDE", icon: "🖱️", configPath: ".cursor/mcp.json  (project)  or  ~/.cursor/mcp.json  (global)", configKey: "mcpServers", description: "AI-first code editor", isMCP: true },
  { id: "windsurf", name: "Windsurf IDE", icon: "🌊", configPath: "~/.codeium/windsurf/mcp_config.json", configKey: "mcpServers", description: "Codeium's AI IDE", isMCP: true },
  { id: "zed", name: "Zed Editor", icon: "⚡", configPath: "~/.config/zed/settings.json  →  context_servers", configKey: "context_servers", description: "Next-gen collaborative editor", isMCP: true },
  { id: "vscode", name: "VS Code", icon: "💻", configPath: "settings.json (via MCP extension by Anthropic)", configKey: "mcpServers", description: "Via VS Code MCP Extension", isMCP: true },
  { id: "chatgpt", name: "ChatGPT", icon: "🟢", configPath: "Custom GPT → Actions → OpenAPI Schema", configKey: "paths", description: "Uses OpenAPI schema, not MCP", isMCP: false },
];

const CATEGORY_LABELS: Record<string, string> = {
  ai: "AI Models", database: "Database", email: "Email", deployment: "Deployment",
  productivity: "Productivity", design: "Design", seo: "SEO & Marketing",
  browser: "Automation", social: "Social Media", data: "Data & Scraping",
};

const CATEGORY_COLORS: Record<string, string> = {
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

// ─── Helpers ───────────────────────────────────────────────────────────────────
function CategoryBadge({ category }: { category: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${CATEGORY_COLORS[category] ?? ""}`}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  );
}

function StatusIcon({ status }: { status: TestStatus }) {
  if (status === "testing") return <Loader2 className="h-4 w-4 animate-spin text-[var(--muted)]" />;
  if (status === "ok")      return <Wifi className="h-4 w-4 text-[var(--success)]" />;
  if (status === "fail")    return <WifiOff className="h-4 w-4 text-[var(--danger)]" />;
  return <div className="h-3 w-3 rounded-full border-2 border-[var(--border)]" />;
}

// ─── Platform Card ─────────────────────────────────────────────────────────────
function PlatformCard({
  platform,
  testStatus,
  onSelect,
}: {
  platform: MCPPlatform;
  testStatus?: { status: TestStatus; latency?: number };
  onSelect: () => void;
}) {
  const Icon = platform.icon;
  const ts = testStatus?.status ?? "idle";
  return (
    <button
      onClick={onSelect}
      className="group w-full text-left rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 hover:border-[var(--accent)]/60 hover:bg-[var(--surface-2)] transition-all duration-200"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${platform.iconColor}20`, border: `1px solid ${platform.iconColor}40` }}>
          <Icon className="h-5 w-5" style={{ color: platform.iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-[var(--foreground)]">{platform.name}</span>
            {platform.featured && <Star className="h-3 w-3 text-[var(--warning)] fill-[var(--warning)] shrink-0" />}
          </div>
          <p className="text-xs text-[var(--muted)] truncate">{platform.tagline}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <CategoryBadge category={platform.category} />
          <div className="flex items-center gap-1.5">
            <StatusIcon status={ts} />
            {ts === "ok" && testStatus?.latency != null && (
              <span className="text-[10px] text-[var(--success)]">{testStatus.latency}ms</span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-[var(--muted)]">{platform.tools.length} tools</span>
        <ChevronRight className="h-3.5 w-3.5 text-[var(--muted)] group-hover:text-[var(--accent)] transition-colors" />
      </div>
    </button>
  );
}

// ─── Platform Detail Panel ─────────────────────────────────────────────────────
function PlatformDetail({
  platform,
  configStore,
  onConfigChange,
  onBack,
}: {
  platform: MCPPlatform;
  configStore: Record<string, Record<string, string>>;
  onConfigChange: (platformId: string, key: string, value: string) => void;
  onBack: () => void;
}) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [showPass, setShowPass] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const Icon = platform.icon;
  const cfg = configStore[platform.id] ?? {};

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTest() {
    setTestStatus("testing");
    setTestMsg("");
    setTestLatency(null);
    try {
      const res = await fetch("/api/mcp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId: platform.id, config: cfg }),
      });
      const data = await res.json();
      setTestStatus(data.ok ? "ok" : "fail");
      setTestMsg(data.message ?? data.error ?? "");
      setTestLatency(data.latencyMs ?? null);
    } catch (e) {
      setTestStatus("fail");
      setTestMsg(String(e));
    }
  }

  function copyVal(key: string) {
    const v = cfg[key];
    if (v) { navigator.clipboard.writeText(v); setCopied(key); setTimeout(() => setCopied(null), 1500); }
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> All Platforms
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${platform.iconColor}20`, border: `1px solid ${platform.iconColor}40` }}>
          <Icon className="h-6 w-6" style={{ color: platform.iconColor }} />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-[var(--foreground)]">{platform.name}</h2>
            {platform.featured && <Star className="h-4 w-4 text-[var(--warning)] fill-[var(--warning)]" />}
            <CategoryBadge category={platform.category} />
            {platform.mcpPackage && (
              <span className="rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/30 px-2 py-0.5 text-[10px] font-mono text-[var(--accent)]">
                MCP ✓
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">{platform.description}</p>
          {platform.docsUrl && (
            <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">
              <ExternalLink className="h-3 w-3" /> View Documentation
            </a>
          )}
        </div>
      </div>

      {/* Config + Test */}
      {platform.configFields.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Connect {platform.name}</CardTitle>
              </div>
              {platform.canTest && (
                <div className="flex items-center gap-2">
                  {testStatus === "ok" && <span className="flex items-center gap-1 text-xs text-[var(--success)]"><Check className="h-3.5 w-3.5" />{testMsg || "Connected"}{testLatency != null && ` · ${testLatency}ms`}</span>}
                  {testStatus === "fail" && <span className="flex items-center gap-1 text-xs text-[var(--danger)]"><X className="h-3.5 w-3.5" />{testMsg || "Failed"}</span>}
                  <Button variant="secondary" size="sm" onClick={handleTest} disabled={testStatus === "testing"}>
                    {testStatus === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5" />}
                    Test Connection
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {platform.configFields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <Label>{field.label}{field.required && <span className="ml-1 text-[var(--danger)]">*</span>}</Label>
                  <div className="relative">
                    <Input
                      type={field.type === "password" && !showPass[field.key] ? "password" : "text"}
                      placeholder={field.placeholder}
                      value={cfg[field.key] ?? ""}
                      onChange={(e) => onConfigChange(platform.id, field.key, e.target.value)}
                      className="pr-16"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
                      {field.type === "password" && (
                        <button type="button" onClick={() => setShowPass((p) => ({ ...p, [field.key]: !p[field.key] }))}
                          className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]">
                          {showPass[field.key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {cfg[field.key] && (
                        <button type="button" onClick={() => copyVal(field.key)} className="p-1 text-[var(--muted)] hover:text-[var(--foreground)]">
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
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save Config
              </Button>
              {saved && <span className="flex items-center gap-1.5 text-sm text-[var(--success)]"><CheckCircle2 className="h-4 w-4" /> Saved</span>}
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
              <Shield className="h-4 w-4 shrink-0 text-[var(--muted)] mt-0.5" />
              <p className="text-xs text-[var(--muted)]">
                Keys are used only for connection testing and the tool playground. For production, add them to <code className="font-mono bg-[var(--surface)] px-1 rounded">.env.local</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tools */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <Wrench className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">Available Tools</h3>
          <span className="ml-auto text-xs text-[var(--muted)]">{platform.tools.length} tools</span>
        </div>
        {platform.tools.map((tool) => (
          <div key={tool.id} className="rounded-lg border border-[var(--border)] overflow-hidden">
            <button
              onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors"
            >
              <Wrench className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--foreground)]">{tool.name}</p>
                <p className="text-xs text-[var(--muted)] truncate">{tool.description}</p>
              </div>
              {tool.params && (expandedTool === tool.id ? <ChevronDown className="h-4 w-4 text-[var(--muted)] shrink-0" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)] shrink-0" />)}
            </button>
            {expandedTool === tool.id && tool.params && (
              <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 space-y-2">
                <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wider">Parameters</p>
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
        ))}
      </div>
    </div>
  );
}

// ─── Playground ────────────────────────────────────────────────────────────────
function Playground({ configStore }: { configStore: Record<string, Record<string, string>> }) {
  const [platformId, setPlatformId] = useState(PLATFORMS[0].id);
  const [toolId, setToolId] = useState(PLATFORMS[0].tools[0].id);
  const [params, setParams] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [history, setHistory] = useState<{ ts: string; platform: string; tool: string; ok: boolean }[]>([]);
  const outputRef = useRef<HTMLPreElement>(null);

  const platform = PLATFORMS.find((p) => p.id === platformId)!;
  const tool = platform.tools.find((t) => t.id === toolId) ?? platform.tools[0];
  const cfg = configStore[platformId] ?? {};

  function switchPlatform(pid: string) {
    const p = PLATFORMS.find((x) => x.id === pid)!;
    setPlatformId(pid);
    setToolId(p.tools[0].id);
    setParams({});
    setResponse(null);
  }

  function switchTool(tid: string) {
    setToolId(tid);
    setParams({});
    setResponse(null);
  }

  async function runTool() {
    setRunning(true);
    setResponse(null);
    setIsError(false);
    setLatency(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/mcp/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platformId, toolId, config: cfg, params }),
      });
      const data = await res.json();
      const ms = Date.now() - start;
      setLatency(ms);
      setIsLive(!!data.live);
      if (!res.ok || data.error) {
        setIsError(true);
        setResponse(JSON.stringify({ error: data.error }, null, 2));
      } else {
        setResponse(JSON.stringify(data.result, null, 2));
      }
      setHistory((h) => [{ ts: new Date().toLocaleTimeString(), platform: platform.name, tool: tool.name, ok: !data.error }, ...h.slice(0, 9)]);
    } catch (e) {
      setIsError(true);
      setResponse(JSON.stringify({ error: String(e) }, null, 2));
      setLatency(Date.now() - start);
    }
    setRunning(false);
    setTimeout(() => outputRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  function clearOutput() { setResponse(null); setIsError(false); setLatency(null); }

  function copyOutput() {
    if (response) { navigator.clipboard.writeText(response); }
  }

  const hasRequiredParams = !tool.params || tool.params.filter((p) => p.required).every((p) => params[p.name]?.trim());

  return (
    <div className="space-y-5">
      {/* Top note */}
      <div className="flex items-center gap-2 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-2.5">
        <FlaskConical className="h-4 w-4 text-[var(--accent)] shrink-0" />
        <p className="text-xs text-[var(--muted)]">
          <span className="text-[var(--foreground)] font-medium">Demo mode:</span> tool calls return realistic sample data. Configure API keys on the Platforms tab for live responses from OpenRouter &amp; Supabase.
        </p>
      </div>

      <div className="grid lg:grid-cols-5 gap-5">
        {/* Left panel — tool selector */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-[var(--accent)]" />
                <CardTitle>Configure Tool</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Platform select */}
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <select
                  value={platformId}
                  onChange={(e) => switchPlatform(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm px-3 py-2 text-[var(--foreground)]"
                >
                  {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Tool select */}
              <div className="space-y-1.5">
                <Label>Tool</Label>
                <select
                  value={toolId}
                  onChange={(e) => switchTool(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm px-3 py-2 text-[var(--foreground)]"
                >
                  {platform.tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              {/* Tool description */}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
                <p className="text-xs text-[var(--muted)]">{tool.description}</p>
              </div>

              {/* Params */}
              {tool.params && tool.params.length > 0 && (
                <div className="space-y-3 pt-1">
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Parameters</p>
                  {tool.params.map((p) => (
                    <div key={p.name} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <code className="text-[11px] font-mono text-[var(--accent)]">{p.name}</code>
                        <span className="text-[10px] text-[var(--muted)] font-mono">{p.type}</span>
                        {p.required && <span className="text-[10px] text-red-400 font-semibold">*</span>}
                      </div>
                      <Input
                        placeholder={p.description}
                        value={params[p.name] ?? ""}
                        onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={runTool}
                disabled={running || !hasRequiredParams}
                className="w-full"
              >
                {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                {running ? "Running…" : "Run Tool"}
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-xs">Recent Runs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-0">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {h.ok ? <Check className="h-3 w-3 text-[var(--success)] shrink-0" /> : <X className="h-3 w-3 text-[var(--danger)] shrink-0" />}
                    <span className="text-[var(--muted)] shrink-0">{h.ts}</span>
                    <span className="text-[var(--foreground)] truncate">{h.platform} · {h.tool}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right panel — output */}
        <div className="lg:col-span-3 flex flex-col">
          <div className="rounded-xl border border-[var(--border)] bg-[#0d1117] flex flex-col min-h-[500px]">
            {/* Terminal header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)] rounded-t-xl">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <div className="h-3 w-3 rounded-full bg-green-500/80" />
                </div>
                <span className="text-xs font-mono text-[var(--muted)] ml-2">
                  {platform.name} → {tool.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {latency != null && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${isError ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                    {isLive ? "LIVE" : "DEMO"} · {latency}ms
                  </span>
                )}
                {response && (
                  <>
                    <button onClick={copyOutput} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" title="Copy output">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={clearOutput} className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors" title="Clear">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Output area */}
            <div className="flex-1 p-4 font-mono text-xs overflow-auto">
              {running && (
                <div className="flex items-center gap-2 text-[var(--muted)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="animate-pulse">Calling {tool.name}…</span>
                </div>
              )}
              {!running && !response && (
                <div className="h-full flex flex-col items-center justify-center gap-3 opacity-40">
                  <MonitorDot className="h-10 w-10" />
                  <p className="text-center">Select a platform and tool,<br />then click <strong>Run Tool</strong> to see output</p>
                </div>
              )}
              {response && (
                <pre ref={outputRef} className={`whitespace-pre-wrap leading-relaxed ${isError ? "text-red-400" : "text-emerald-300"}`}>
                  {response}
                </pre>
              )}
            </div>

            {/* Prompt line */}
            <div className="border-t border-[var(--border)] px-4 py-2 flex items-center gap-2 opacity-50">
              <span className="text-[var(--accent)] font-mono text-xs">$</span>
              <span className="text-[var(--muted)] font-mono text-xs">mcp call {platform.id}.{toolId}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MCP JSON Generator ────────────────────────────────────────────────────────
function MCPJsonTab({ configStore }: { configStore: Record<string, Record<string, string>> }) {
  const [selectedClient, setSelectedClient] = useState("claude_desktop");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["supabase", "notion", "apify", "browser_automation", "desktop_commander"]);
  const [copiedJson, setCopiedJson] = useState(false);

  const client = AI_CLIENTS.find((c) => c.id === selectedClient)!;

  function togglePlatform(id: string) {
    setSelectedPlatforms((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  const generatedJson = useMemo(() => {
    if (!client.isMCP) return null;

    const servers: Record<string, unknown> = {};
    for (const pid of selectedPlatforms) {
      const p = PLATFORMS.find((x) => x.id === pid);
      if (!p || !p.mcpPackage) continue;

      const env: Record<string, string> = {};
      if (p.mcpEnvMap) {
        for (const [envKey, cfgKey] of Object.entries(p.mcpEnvMap)) {
          const val = configStore[pid]?.[cfgKey] ?? `YOUR_${envKey}`;
          if (envKey === "OPENAPI_MCP_HEADERS") {
            env[envKey] = JSON.stringify({ Authorization: `Bearer ${val}` });
          } else {
            env[envKey] = val;
          }
        }
      }

      servers[pid] = {
        command: "npx",
        args: ["-y", p.mcpPackage],
        ...(Object.keys(env).length > 0 ? { env } : {}),
      };
    }

    // Special wrapper for zed
    if (selectedClient === "zed") {
      return JSON.stringify({ context_servers: servers }, null, 2);
    }

    return JSON.stringify({ [client.configKey]: servers }, null, 2);
  }, [selectedClient, selectedPlatforms, configStore, client]);

  // ChatGPT OpenAPI schema generator
  const openApiSchema = useMemo(() => {
    return JSON.stringify({
      openapi: "3.1.0",
      info: { title: "PixelReach AI MCP Bridge", version: "1.0.0" },
      servers: [{ url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://your-app.vercel.app"}/api/mcp` }],
      paths: {
        "/run": {
          post: {
            operationId: "runMCPTool",
            summary: "Execute an MCP tool",
            requestBody: {
              required: true,
              content: { "application/json": { schema: { type: "object", properties: { platformId: { type: "string" }, toolId: { type: "string" }, params: { type: "object" } } } } },
            },
            responses: { "200": { description: "Tool result", content: { "application/json": { schema: { type: "object" } } } } },
          },
        },
      },
    }, null, 2);
  }, []);

  function copyJson() {
    const text = client.isMCP ? generatedJson : openApiSchema;
    if (text) { navigator.clipboard.writeText(text); setCopiedJson(true); setTimeout(() => setCopiedJson(false), 2000); }
  }

  const platformsWithMCP = PLATFORMS.filter((p) => p.mcpPackage);
  const platformsWithoutMCP = PLATFORMS.filter((p) => !p.mcpPackage);

  return (
    <div className="space-y-5">
      {/* AI Client selector */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {AI_CLIENTS.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedClient(c.id)}
            className={`rounded-xl border p-3 text-center transition-all ${selectedClient === c.id ? "border-[var(--accent)] bg-[var(--accent)]/10" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)]/40"}`}
          >
            <div className="text-xl mb-1">{c.icon}</div>
            <p className="text-xs font-semibold text-[var(--foreground)] leading-tight">{c.name}</p>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">{c.isMCP ? "MCP" : "OpenAPI"}</p>
          </button>
        ))}
      </div>

      {/* Client info bar */}
      <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <Info className="h-4 w-4 text-[var(--accent)] shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--foreground)]">{client.name}</p>
          <p className="text-xs text-[var(--muted)]">{client.description}</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <code className="text-[10px] font-mono text-[var(--accent)] bg-[var(--surface)] px-2 py-0.5 rounded truncate">{client.configPath}</code>
            {client.isMCP && (
              <span className="shrink-0 text-[10px] text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/20 px-2 py-0.5 rounded-full font-semibold">MCP native</span>
            )}
          </div>
        </div>
      </div>

      {client.isMCP ? (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Platform selector */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Select Platforms to Include</p>

            <div className="space-y-2">
              <p className="text-[10px] text-[var(--accent)] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Check className="h-3 w-3" /> Official MCP Packages
              </p>
              {platformsWithMCP.map((p) => {
                const Icon = p.icon;
                const checked = selectedPlatforms.includes(p.id);
                return (
                  <label key={p.id} className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-all ${checked ? "border-[var(--accent)]/60 bg-[var(--accent)]/5" : "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border)]"}`}>
                    <input type="checkbox" checked={checked} onChange={() => togglePlatform(p.id)} className="sr-only" />
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border)]"}`}>
                      {checked && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <Icon className="h-4 w-4 shrink-0" style={{ color: p.iconColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--foreground)]">{p.name}</p>
                      <code className="text-[10px] text-[var(--muted)] font-mono truncate block">{p.mcpPackage}</code>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-[var(--muted)] font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-3 w-3" /> No Official Package Yet
              </p>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] divide-y divide-[var(--border)]">
                {platformsWithoutMCP.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 opacity-60">
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: p.iconColor }} />
                      <span className="text-xs text-[var(--muted)]">{p.name}</span>
                      <span className="ml-auto text-[10px] text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded">via API key</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Generated JSON */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Generated Config JSON</p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={copyJson}>
                  {copiedJson ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedJson ? "Copied!" : "Copy JSON"}
                </Button>
                <Button variant="secondary" size="sm" onClick={() => {
                  if (generatedJson) {
                    const blob = new Blob([generatedJson], { type: "application/json" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = client.id === "claude_code" ? "settings.json" : "mcp_config.json";
                    a.click();
                  }
                }}>
                  <Download className="h-3.5 w-3.5" />
                  Download
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[#0d1117] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
                <Brackets className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="text-xs font-mono text-[var(--muted)]">
                  {client.id === "zed" ? "~/.config/zed/settings.json" : client.configPath.split("  ")[0]}
                </span>
              </div>
              <pre className="p-4 text-xs font-mono text-emerald-300 overflow-auto max-h-[420px] leading-relaxed whitespace-pre">
                {generatedJson || '{\n  "mcpServers": {}\n}'}
              </pre>
            </div>

            {/* Setup steps */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
              <p className="text-xs font-semibold text-[var(--foreground)] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[var(--accent)]" /> Setup Instructions
              </p>
              {[
                `1. Copy the JSON config above (click "Copy JSON")`,
                `2. Open: ${client.configPath}`,
                `3. Paste and replace the entire file content`,
                `4. Replace YOUR_* placeholders with your actual API keys`,
                `5. Restart ${client.name} to load the new MCP servers`,
                `6. The tools will appear automatically in your AI assistant`,
              ].map((step) => (
                <p key={step} className="text-xs text-[var(--muted)] leading-relaxed">{step}</p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // ChatGPT — OpenAPI schema
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-400" />
              <p className="text-sm font-semibold text-amber-300">ChatGPT doesn&apos;t use MCP (yet)</p>
            </div>
            <p className="text-sm text-[var(--muted)] leading-relaxed">
              ChatGPT Custom GPTs use <strong className="text-[var(--foreground)]">OpenAPI Actions</strong> instead of MCP.
              You can connect your PixelReach AI tools to ChatGPT using the schema on the right — it exposes your tool API as a Custom GPT Action.
            </p>
            <div className="space-y-2 pt-1">
              {["1. Go to ChatGPT → Explore GPTs → Create", "2. Click 'Actions' → 'Add actions'", "3. Paste the OpenAPI schema from the right panel", "4. Add your API URL and authentication", "5. Save and test your Custom GPT"].map((s) => (
                <p key={s} className="text-xs text-[var(--muted)]">{s}</p>
              ))}
            </div>
            <a href="https://platform.openai.com/docs/actions" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">
              <ArrowUpRight className="h-3.5 w-3.5" /> ChatGPT Actions Documentation
            </a>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">OpenAPI Schema for Custom GPT</p>
              <Button variant="secondary" size="sm" onClick={copyJson}>
                {copiedJson ? <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedJson ? "Copied!" : "Copy Schema"}
              </Button>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[#0d1117] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
                <Brackets className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-mono text-[var(--muted)]">openapi_schema.json</span>
              </div>
              <pre className="p-4 text-xs font-mono text-amber-300 overflow-auto max-h-[480px] leading-relaxed whitespace-pre">
                {openApiSchema}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tool Explorer ─────────────────────────────────────────────────────────────
function ToolExplorer() {
  const [query, setQuery] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const allTools = useMemo(() => PLATFORMS.flatMap((p) =>
    p.tools.map((t) => ({ ...t, platformName: p.name, platformId: p.id, category: p.category, iconColor: p.iconColor, icon: p.icon }))
  ), []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allTools.filter((t) => {
      const catMatch = filterCat === "all" || t.category === filterCat;
      const textMatch = !q || t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.platformName.toLowerCase().includes(q);
      return catMatch && textMatch;
    });
  }, [allTools, query, filterCat]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Platforms", value: PLATFORMS.length, icon: Plug },
          { label: "Total Tools", value: allTools.length, icon: Wrench },
          { label: "Categories", value: Object.keys(CATEGORY_LABELS).length, icon: LayoutTemplate },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-center">
            <Icon className="h-5 w-5 text-[var(--accent)] mx-auto mb-1" />
            <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
            <p className="text-xs text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
          <Input placeholder="Search tools by name, description, or platform…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-sm px-3 py-2 text-[var(--foreground)]">
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <p className="text-xs text-[var(--muted)]">Showing {filtered.length} of {allTools.length} tools{query && ` matching "${query}"`}</p>

      <div className="space-y-2">
        {filtered.map((tool) => {
          const PIcon = tool.icon;
          const uid = `${tool.platformId}__${tool.id}`;
          return (
            <div key={uid} className="rounded-xl border border-[var(--border)] overflow-hidden">
              <button onClick={() => setExpanded(expanded === uid ? null : uid)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[var(--surface-2)] transition-colors">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${tool.iconColor}20` }}>
                  <PIcon className="h-3.5 w-3.5" style={{ color: tool.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-[var(--foreground)]">{tool.name}</span>
                    <span className="text-[10px] text-[var(--muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border)]">{tool.platformName}</span>
                  </div>
                  <p className="text-xs text-[var(--muted)] truncate">{tool.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CategoryBadge category={tool.category} />
                  {tool.params && (expanded === uid ? <ChevronDown className="h-4 w-4 text-[var(--muted)]" /> : <ChevronRight className="h-4 w-4 text-[var(--muted)]" />)}
                </div>
              </button>
              {expanded === uid && tool.params && (
                <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 space-y-2">
                  {tool.params.map((p) => (
                    <div key={p.name} className="flex items-start gap-3">
                      <code className="shrink-0 rounded bg-[var(--surface)] px-2 py-0.5 text-[11px] text-[var(--accent)] font-mono">{p.name}</code>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-mono text-[var(--muted)] bg-[var(--surface)] px-1.5 py-0.5 rounded">{p.type}</span>
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
          <div className="py-12 text-center"><Search className="h-8 w-8 text-[var(--border)] mx-auto mb-3" /><p className="text-sm text-[var(--muted)]">No tools match your search.</p></div>
        )}
      </div>
    </div>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const examples = [
    { title: "OpenRouter Chat (Live)", lang: "ts", code: `// POST /api/mcp/run — live if key configured
fetch("/api/mcp/run", {
  method: "POST",
  body: JSON.stringify({
    platformId: "openrouter",
    toolId: "chat_completion",
    config: { openrouter_api_key: "sk-or-v1-..." },
    params: { model: "anthropic/claude-sonnet-4-6", content: "Write a cold email" }
  })
})` },
    { title: "Supabase SQL Query", lang: "ts", code: `// POST /api/mcp/run
fetch("/api/mcp/run", {
  method: "POST",
  body: JSON.stringify({
    platformId: "supabase",
    toolId: "execute_sql",
    config: { supabase_url: "https://xxx.supabase.co", supabase_anon_key: "eyJ..." },
    params: { query: "SELECT COUNT(*) FROM leads WHERE status='new'", project_id: "xxx" }
  })
})` },
    { title: "Test Platform Connection", lang: "ts", code: `// POST /api/mcp/test — real HTTP health check
fetch("/api/mcp/test", {
  method: "POST",
  body: JSON.stringify({
    platformId: "notion",
    config: { notion_token: "secret_xxx" }
  })
})
// → { ok: true, latencyMs: 182, message: "Logged in as John Doe" }` },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-5 py-4">
        <div className="flex items-center gap-2 mb-2"><Info className="h-4 w-4 text-[var(--accent)]" /><p className="text-sm font-semibold text-[var(--foreground)]">What is MCP?</p></div>
        <p className="text-sm text-[var(--muted)] leading-relaxed">
          <strong className="text-[var(--foreground)]">Model Context Protocol (MCP)</strong> is an open standard by Anthropic that lets AI models connect to external tools, APIs, and data sources via a standardized JSON config. Instead of hardcoding integrations, any MCP-compatible AI (Claude Desktop, Cursor, Windsurf, Zed) automatically discovers and calls tools through this protocol.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: Plug, color: "text-[var(--accent)]", title: "1. Connect Platform", desc: "Go to Platforms → pick a platform → enter your API key → click Save Config." },
          { icon: Wifi, color: "text-emerald-400", title: "2. Test Connection", desc: "Click Test Connection to verify your API key works. Shows latency and auth status in real-time." },
          { icon: FlaskConical, color: "text-purple-400", title: "3. Try in Playground", desc: "Go to Playground → select any tool → fill params → Run Tool to see live JSON output." },
          { icon: Brackets, color: "text-amber-400", title: "4. Export MCP JSON", desc: "Go to MCP JSON → pick Claude/Cursor/Windsurf → select platforms → copy config → paste into your AI tool." },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2">
            <Icon className={`h-5 w-5 ${color}`} />
            <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2"><Code2 className="h-4 w-4 text-[var(--accent)]" /><h3 className="text-sm font-semibold text-[var(--foreground)]">API Examples</h3></div>
        {examples.map(({ title, code }) => (
          <div key={title} className="rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="flex items-center gap-2 bg-[var(--surface-2)] px-4 py-2.5 border-b border-[var(--border)]">
              <Code2 className="h-3.5 w-3.5 text-[var(--accent)]" /><p className="text-xs font-medium text-[var(--foreground)]">{title}</p>
            </div>
            <pre className="p-4 text-xs text-emerald-300 font-mono leading-relaxed bg-[var(--surface)] overflow-x-auto"><code>{code}</code></pre>
          </div>
        ))}
      </div>

      {/* MCP clients table */}
      <Card>
        <CardHeader><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-[var(--accent)]" /><CardTitle>Compatible AI Clients</CardTitle></div></CardHeader>
        <CardContent>
          <div className="divide-y divide-[var(--border)]">
            {AI_CLIENTS.map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                <span className="text-lg w-6 text-center">{c.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">{c.name}</p>
                  <p className="text-xs text-[var(--muted)] font-mono">{c.configPath}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.isMCP ? "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20" : "text-amber-400 bg-amber-500/10 border-amber-500/20"}`}>
                  {c.isMCP ? "MCP native" : "OpenAPI"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Export ───────────────────────────────────────────────────────────────
export function MCPToolsClient() {
  const [selectedPlatform, setSelectedPlatform] = useState<MCPPlatform | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [configStore, setConfigStore] = useState<Record<string, Record<string, string>>>({});
  const [testStatuses, setTestStatuses] = useState<Record<string, { status: TestStatus; latency?: number }>>({});

  const updateConfig = useCallback((platformId: string, key: string, value: string) => {
    setConfigStore((prev) => ({ ...prev, [platformId]: { ...prev[platformId], [key]: value } }));
  }, []);

  async function testAll() {
    const testable = PLATFORMS.filter((p) => p.canTest && configStore[p.id]);
    for (const p of testable) {
      setTestStatuses((prev) => ({ ...prev, [p.id]: { status: "testing" } }));
      try {
        const res = await fetch("/api/mcp/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platformId: p.id, config: configStore[p.id] }),
        });
        const data = await res.json();
        setTestStatuses((prev) => ({ ...prev, [p.id]: { status: data.ok ? "ok" : "fail", latency: data.latencyMs } }));
      } catch {
        setTestStatuses((prev) => ({ ...prev, [p.id]: { status: "fail" } }));
      }
    }
  }

  const filteredPlatforms = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return PLATFORMS;
    return PLATFORMS.filter((p) => p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q) || CATEGORY_LABELS[p.category]?.toLowerCase().includes(q));
  }, [searchQuery]);

  const connectedCount = Object.values(testStatuses).filter((s) => s.status === "ok").length;
  const totalTools = PLATFORMS.reduce((s, p) => s + p.tools.length, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Plug className="h-5 w-5 text-[var(--accent)]" />
            <h1 className="text-xl font-bold text-[var(--foreground)]">MCP Connect</h1>
            <span className="rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 px-2 py-0.5 text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">Beta</span>
          </div>
          <p className="text-sm text-[var(--muted)]">
            {PLATFORMS.length} platforms · {totalTools} tools · connect Claude, ChatGPT, Cursor &amp; more via MCP JSON
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connectedCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--success)]">
              <Wifi className="h-3.5 w-3.5" /> {connectedCount} connected
            </span>
          )}
          <Button variant="secondary" size="sm" onClick={testAll}>
            <Zap className="h-3.5 w-3.5" /> Test All
          </Button>
        </div>
      </div>

      <Tabs defaultValue="platforms">
        <TabsList className="mb-5 flex-wrap gap-y-1">
          <TabsTrigger value="platforms"><Plug className="h-3.5 w-3.5 mr-1.5" />Platforms</TabsTrigger>
          <TabsTrigger value="playground"><FlaskConical className="h-3.5 w-3.5 mr-1.5" />Playground</TabsTrigger>
          <TabsTrigger value="mcpjson"><Brackets className="h-3.5 w-3.5 mr-1.5" />MCP JSON</TabsTrigger>
          <TabsTrigger value="explorer"><Search className="h-3.5 w-3.5 mr-1.5" />Tool Explorer</TabsTrigger>
          <TabsTrigger value="howto"><BookOpen className="h-3.5 w-3.5 mr-1.5" />How It Works</TabsTrigger>
        </TabsList>

        {/* ── Platforms ── */}
        <TabsContent value="platforms">
          {selectedPlatform ? (
            <PlatformDetail
              platform={selectedPlatform}
              configStore={configStore}
              onConfigChange={updateConfig}
              onBack={() => setSelectedPlatform(null)}
            />
          ) : (
            <div className="space-y-5">
              {/* Featured */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-[var(--warning)] fill-[var(--warning)]" />
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Featured & Already Integrated</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {PLATFORMS.filter((p) => p.featured).map((p) => (
                    <PlatformCard key={p.id} platform={p} testStatus={testStatuses[p.id]} onSelect={() => setSelectedPlatform(p)} />
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">All Platforms</p>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]" />
                    <Input placeholder="Filter platforms…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-8 text-xs" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredPlatforms.map((p) => (
                    <PlatformCard key={p.id} platform={p} testStatus={testStatuses[p.id]} onSelect={() => setSelectedPlatform(p)} />
                  ))}
                  {filteredPlatforms.length === 0 && (
                    <div className="col-span-3 py-10 text-center"><p className="text-sm text-[var(--muted)]">No platforms match &ldquo;{searchQuery}&rdquo;</p></div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Playground ── */}
        <TabsContent value="playground">
          <Playground configStore={configStore} />
        </TabsContent>

        {/* ── MCP JSON ── */}
        <TabsContent value="mcpjson">
          <MCPJsonTab configStore={configStore} />
        </TabsContent>

        {/* ── Tool Explorer ── */}
        <TabsContent value="explorer">
          <ToolExplorer />
        </TabsContent>

        {/* ── How It Works ── */}
        <TabsContent value="howto">
          <HowItWorks />
        </TabsContent>
      </Tabs>
    </div>
  );
}
