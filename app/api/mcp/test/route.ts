import { NextRequest, NextResponse } from "next/server";

type TestResult = { ok: boolean; latencyMs: number; message?: string; error?: string };

async function testAnthropic(key: string): Promise<TestResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    });
    const latencyMs = Date.now() - t;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, latencyMs, message: `${data.data?.length ?? 0} models available` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: String(e) };
  }
}

async function testOpenRouter(key: string): Promise<TestResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const latencyMs = Date.now() - t;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, latencyMs, message: `${data.data?.length ?? 0} models available` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: String(e) };
  }
}

async function testSupabase(url: string, key: string): Promise<TestResult> {
  const t = Date.now();
  try {
    const base = url.replace(/\/$/, "");
    const res = await fetch(`${base}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const latencyMs = Date.now() - t;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    return { ok: true, latencyMs, message: "Postgres REST API reachable" };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: String(e) };
  }
}

async function testVercel(token: string): Promise<TestResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://api.vercel.com/v2/teams", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const latencyMs = Date.now() - t;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    return { ok: true, latencyMs, message: "Vercel API authenticated" };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: String(e) };
  }
}

async function testNotion(token: string): Promise<TestResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://api.notion.com/v1/users/me", {
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": "2022-06-28" },
    });
    const latencyMs = Date.now() - t;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, latencyMs, message: `Logged in as ${data.name ?? "Notion user"}` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: String(e) };
  }
}

async function testBuffer(token: string): Promise<TestResult> {
  const t = Date.now();
  try {
    const res = await fetch(`https://api.bufferapp.com/1/user.json?access_token=${token}`);
    const latencyMs = Date.now() - t;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, latencyMs, message: `Connected as ${data.name ?? "Buffer user"}` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: String(e) };
  }
}

async function testDataForSEO(login: string, password: string): Promise<TestResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://api.dataforseo.com/v3/appendix/user_data", {
      headers: { Authorization: `Basic ${Buffer.from(`${login}:${password}`).toString("base64")}` },
    });
    const latencyMs = Date.now() - t;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    return { ok: true, latencyMs, message: "DataForSEO API authenticated" };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: String(e) };
  }
}

async function testApify(token: string): Promise<TestResult> {
  const t = Date.now();
  try {
    const res = await fetch("https://api.apify.com/v2/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const latencyMs = Date.now() - t;
    if (!res.ok) return { ok: false, latencyMs, error: `HTTP ${res.status}` };
    const data = await res.json();
    return { ok: true, latencyMs, message: `Connected as ${data.data?.username ?? "Apify user"}` };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t, error: String(e) };
  }
}

export async function POST(req: NextRequest) {
  const { platformId, config } = await req.json() as {
    platformId: string;
    config: Record<string, string>;
  };

  let result: TestResult;

  switch (platformId) {
    case "anthropic":
      result = await testAnthropic(config.anthropic_api_key ?? "");
      break;
    case "openrouter":
      result = await testOpenRouter(config.openrouter_api_key ?? "");
      break;
    case "supabase":
      result = await testSupabase(config.supabase_url ?? "", config.supabase_anon_key ?? config.supabase_service_key ?? "");
      break;
    case "vercel":
      result = await testVercel(config.vercel_token ?? "");
      break;
    case "notion":
      result = await testNotion(config.notion_token ?? "");
      break;
    case "buffer":
      result = await testBuffer(config.buffer_token ?? "");
      break;
    case "dataforseo":
      result = await testDataForSEO(config.dataforseo_login ?? "", config.dataforseo_password ?? "");
      break;
    case "apify":
      result = await testApify(config.apify_token ?? "");
      break;
    default:
      result = { ok: false, latencyMs: 0, error: "No test available for this platform" };
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
