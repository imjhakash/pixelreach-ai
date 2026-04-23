import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";
import { encrypt } from "@/lib/encrypt";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceClient();

    const body = await req.json();
    const {
      company_name, company_address, services, portfolio_url, details,
      from_name, reply_to, daily_limit, delay_seconds,
      openrouter_api_key, openrouter_model, openrouter_fallback_model,
      openrouter_temperature, openrouter_max_tokens,
    } = body;

    const { data: profile, error } = await supabase
      .from("sender_profiles")
      .insert({
        user_id: user.id,
        company_name,
        company_address: company_address || null,
        services: services || null,
        portfolio_url: portfolio_url || null,
        details: details || null,
        from_name,
        reply_to: reply_to || null,
        daily_limit: daily_limit ?? 50,
        delay_seconds: delay_seconds ?? 60,
        openrouter_api_key_encrypted: openrouter_api_key ? encrypt(openrouter_api_key) : null,
        openrouter_model: openrouter_model || "anthropic/claude-sonnet-4",
        openrouter_fallback_model: openrouter_fallback_model || "openai/gpt-4o-mini",
        openrouter_temperature: openrouter_temperature ?? 0.7,
        openrouter_max_tokens: openrouter_max_tokens ?? 600,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ profile });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
