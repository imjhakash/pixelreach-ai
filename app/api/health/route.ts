import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase/api-client";
import nodemailer from "nodemailer";

export async function GET(_req: NextRequest) {
  const results: Record<string, { ok: boolean; latencyMs?: number; error?: string }> = {};

  // 1. Supabase DB
  const t0 = Date.now();
  try {
    const sb = getServiceClient();
    const { error } = await sb.from("lead_lists").select("id", { head: true, count: "exact" }).limit(1);
    results.supabase = { ok: !error, latencyMs: Date.now() - t0, error: error?.message };
  } catch (e) {
    results.supabase = { ok: false, error: String(e) };
  }

  // 2. Netlify function runtime (always ok if we're here)
  results.runtime = { ok: true, latencyMs: 0 };

  return NextResponse.json({ ok: true, checks: results });
}

export async function POST(req: NextRequest) {
  const { type, config } = await req.json();

  if (type === "smtp") {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: Number(config.smtp_port),
        secure: Number(config.smtp_port) === 465,
        auth: { user: config.smtp_user, pass: config.smtp_pass },
        connectionTimeout: 8000,
      });
      await transporter.verify();
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
    }
  }

  if (type === "openrouter") {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${config.api_key}` },
      });
      return NextResponse.json({ ok: res.ok, status: res.status });
    } catch (e) {
      return NextResponse.json({ ok: false, error: String(e) }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });
}
