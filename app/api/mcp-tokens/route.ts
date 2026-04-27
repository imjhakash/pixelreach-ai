import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";
import { generateToken } from "@/lib/mcp/auth";

export async function GET(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getServiceClient();
  const { data, error } = await sb
    .from("api_tokens")
    .select("id, label, token_prefix, last_used_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tokens: data });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { label } = await req.json().catch(() => ({}));
  if (!label || typeof label !== "string") {
    return NextResponse.json({ error: "Label required" }, { status: 400 });
  }

  const { token, token_hash, token_prefix } = generateToken();
  const sb = getServiceClient();
  const { data, error } = await sb
    .from("api_tokens")
    .insert({ user_id: user.id, label: label.trim(), token_hash, token_prefix })
    .select("id, label, token_prefix, last_used_at, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ token, record: data });
}
