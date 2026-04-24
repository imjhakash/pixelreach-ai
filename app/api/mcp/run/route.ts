import { NextRequest, NextResponse } from "next/server";

// Simulated responses for tools without live backend (demo mode)
const MOCK: Record<string, unknown> = {
  "anthropic:messages": { id: "msg_01XFDUDYJgAACzvnptvVoYEL", type: "message", role: "assistant", content: [{ type: "text", text: "Hello! I'm Claude. How can I help you today?" }], model: "claude-sonnet-4-6", stop_reason: "end_turn", usage: { input_tokens: 25, output_tokens: 18 } },
  "anthropic:tool_use": { id: "msg_tooluse_01", type: "message", role: "assistant", content: [{ type: "tool_use", id: "toolu_01", name: "get_weather", input: { location: "San Francisco" } }], stop_reason: "tool_use" },
  "openrouter:get_model_info": { id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", description: "Latest Claude Sonnet model", context_length: 200000, pricing: { prompt: "0.000003", completion: "0.000015" } },
  "openrouter:search_models": { data: [{ id: "anthropic/claude-sonnet-4-6", name: "Claude Sonnet 4.6", context_length: 200000 }, { id: "openai/gpt-4o", name: "GPT-4o", context_length: 128000 }, { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", context_length: 1000000 }] },
  "supabase:list_tables": { tables: ["lead_lists", "leads", "sender_profiles", "email_accounts", "campaigns", "follow_ups", "email_sends", "tracking_events", "prompt_studio_settings"], count: 9 },
  "supabase:list_migrations": { migrations: [{ version: "20260101_001", name: "create_lead_lists", applied_at: "2026-01-01T10:00:00Z" }, { version: "20260115_002", name: "add_email_sends", applied_at: "2026-01-15T14:00:00Z" }] },
  "vercel:list_projects": { projects: [{ id: "prj_abc123", name: "pixelreach-ai", framework: "nextjs", updatedAt: 1745510400000 }, { id: "prj_def456", name: "my-portfolio", framework: "astro", updatedAt: 1745424000000 }], pagination: { count: 2, next: null } },
  "vercel:list_deployments": { deployments: [{ uid: "dpl_xxx1", name: "pixelreach-ai", state: "READY", url: "pixelreach-ai-abc.vercel.app", createdAt: 1745510400000 }, { uid: "dpl_xxx2", name: "pixelreach-ai", state: "READY", url: "pixelreach-ai-def.vercel.app", createdAt: 1745424000000 }] },
  "notion:notion_search": { results: [{ id: "page-1", object: "page", url: "https://notion.so/Marketing-Strategy-2026", properties: { title: { title: [{ plain_text: "Marketing Strategy 2026" }] } } }, { id: "page-2", object: "page", url: "https://notion.so/Competitor-Analysis", properties: { title: { title: [{ plain_text: "Competitor Analysis" }] } } }], has_more: false },
  "notion:notion_get_users": { results: [{ id: "user-1", type: "person", name: "John Doe", avatar_url: null, person: { email: "john@company.com" } }] },
  "buffer:list_channels": { data: [{ id: "ch-1", service: "twitter", service_username: "@pixelreach", statistics: { followers: 2340 } }, { id: "ch-2", service: "linkedin", service_username: "PixelReach AI", statistics: { followers: 891 } }] },
  "buffer:list_posts": { data: [{ id: "post-1", text: "🚀 Exciting new feature!", status: "sent", statistics: { clicks: 142, reach: 2340, engagement_rate: 0.061 } }, { id: "post-2", text: "Tips for better email deliverability", status: "scheduled", scheduled_at: "2026-04-25T14:00:00Z" }] },
  "gsc:list_gsc_sites": { siteEntry: [{ siteUrl: "https://pixelreach.ai/", permissionLevel: "siteOwner" }, { siteUrl: "sc-domain:pixelreach.ai", permissionLevel: "siteOwner" }] },
  "gsc:get_search_analytics": { rows: [{ keys: ["email marketing software"], clicks: 245, impressions: 3420, ctr: 0.0717, position: 4.2 }, { keys: ["cold email ai tool"], clicks: 183, impressions: 2910, ctr: 0.0629, position: 6.1 }, { keys: ["ai email generator"], clicks: 97, impressions: 1540, ctr: 0.063, position: 7.8 }] },
  "dataforseo:kw_overview": { keyword: "email marketing software", search_volume: 49500, competition: 0.91, cpc: 4.32, keyword_difficulty: 72, trend: [4100, 4300, 4500, 4800, 4900, 5200, 5100, 5300] },
  "dataforseo:serp_organic": { items: [{ type: "organic", rank_absolute: 1, title: "Best Email Marketing Software 2026", url: "https://example.com", description: "Compare the top email marketing tools..." }, { type: "organic", rank_absolute: 2, title: "Email Marketing Platform Reviews", url: "https://reviews.example.com" }] },
  "dataforseo:kw_ideas": { keywords: ["email marketing software", "email automation tools", "best email platform", "email campaign software", "bulk email sender", "cold email software"], total_count: 48 },
  "apify:search_actors": { items: [{ id: "apify/web-scraper", name: "Web Scraper", description: "General web scraper for any website", stats: { totalRuns: 1234567 } }, { id: "apify/instagram-scraper", name: "Instagram Scraper", stats: { totalRuns: 987654 } }], total: 2 },
  "apify:rag_web_browser": { url: "https://example.com", title: "Example Domain", markdown: "# Example Domain\n\nThis domain is for use in illustrative examples in documents.\n\n**More information**: [IANA Reserved Domains](https://www.iana.org/domains/reserved)", metadata: { description: "Example domain", language: "en", wordCount: 42 } },
  "browser_automation:screenshot": { success: true, path: "/tmp/screenshot_1745510400.png", width: 1280, height: 720, format: "png", size_bytes: 184320 },
  "browser_automation:get_page_text": { url: "https://example.com", title: "Example Domain", text: "Example Domain\nThis domain is for use in illustrative examples in documents. You may use this domain in literature without prior coordination or asking for permission.", word_count: 38 },
  "google_calendar:list_calendars": { items: [{ id: "primary", summary: "John Doe", primary: true, accessRole: "owner" }, { id: "team@company.com", summary: "Team Calendar", accessRole: "reader" }] },
  "google_calendar:suggest_time": { suggestions: [{ start: "2026-04-25T10:00:00+05:30", end: "2026-04-25T11:00:00+05:30", confidence: 0.95 }, { start: "2026-04-25T14:00:00+05:30", end: "2026-04-25T15:00:00+05:30", confidence: 0.87 }] },
};

function getMockKey(platformId: string, toolId: string) {
  const exact = `${platformId}:${toolId}`;
  if (MOCK[exact]) return exact;
  // Try platform prefix
  const prefix = Object.keys(MOCK).find((k) => k.startsWith(platformId + ":"));
  return prefix ?? null;
}

// Live executions for supported platforms
async function runOpenRouterChat(config: Record<string, string>, params: Record<string, string>) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.openrouter_api_key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    },
    body: JSON.stringify({
      model: params.model || "anthropic/claude-haiku-4-5",
      messages: [{ role: "user", content: params.content || params.message || "Hello! What can you do?" }],
      max_tokens: 200,
    }),
  });
  return res.json();
}

async function runSupabaseSQL(config: Record<string, string>, params: Record<string, string>) {
  const base = (config.supabase_url ?? "").replace(/\/$/, "");
  const key = config.supabase_service_key || config.supabase_anon_key;
  const res = await fetch(`${base}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: params.query || "SELECT version();" }),
  });
  if (!res.ok) {
    // Fall back to mock for demo
    return MOCK["supabase:execute_sql"] ?? { error: "SQL execution failed", status: res.status };
  }
  return res.json();
}

export async function POST(req: NextRequest) {
  const { platformId, toolId, config, params } = await req.json() as {
    platformId: string;
    toolId: string;
    config: Record<string, string>;
    params: Record<string, string>;
  };

  const t = Date.now();

  try {
    let result: unknown;

    // Live execution for specific tool+platform combos when API key is provided
    if (platformId === "openrouter" && toolId === "chat_completion" && config.openrouter_api_key) {
      result = await runOpenRouterChat(config, params);
    } else if (platformId === "supabase" && toolId === "execute_sql" && config.supabase_url) {
      result = await runSupabaseSQL(config, params);
    } else {
      // Demo/simulated response
      const mockKey = getMockKey(platformId, toolId);
      result = mockKey ? MOCK[mockKey] : { message: `Tool "${toolId}" executed (demo mode — configure API keys for live data)`, params, timestamp: new Date().toISOString() };
    }

    return NextResponse.json({ result, latencyMs: Date.now() - t, live: false });
  } catch (e) {
    return NextResponse.json({ error: String(e), latencyMs: Date.now() - t }, { status: 500 });
  }
}
