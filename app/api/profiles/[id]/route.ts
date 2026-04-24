import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, getUserFromRequest } from "@/lib/supabase/api-client";
import { encrypt } from "@/lib/encrypt";
import { getProfileSignaturesMapFromUser, normalizeEmailSignatures } from "@/lib/prompt-studio";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const updates: Record<string, unknown> = {
      company_name: body.company_name,
      company_address: body.company_address || null,
      services: body.services || null,
      portfolio_url: body.portfolio_url || null,
      details: body.details || null,
      from_name: body.from_name,
      reply_to: body.reply_to || null,
      daily_limit: body.daily_limit ?? 50,
      delay_seconds: body.delay_seconds ?? 60,
      openrouter_model: body.openrouter_model || "anthropic/claude-sonnet-4",
      openrouter_fallback_model: body.openrouter_fallback_model || "openai/gpt-4o-mini",
      openrouter_temperature: body.openrouter_temperature ?? 0.7,
      openrouter_max_tokens: body.openrouter_max_tokens ?? 600,
    };

    if (body.clear_openrouter_api_key) {
      updates.openrouter_api_key_encrypted = null;
    } else if (typeof body.openrouter_api_key === "string" && body.openrouter_api_key.trim()) {
      updates.openrouter_api_key_encrypted = encrypt(body.openrouter_api_key.trim());
    }

    const supabase = getServiceClient();
    const { data: profile, error } = await supabase
      .from("sender_profiles")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    const signatures = normalizeEmailSignatures(body.email_signatures);
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        profile_signatures: {
          ...getProfileSignaturesMapFromUser(user),
          [profile.id]: signatures,
        },
      },
    });

    return NextResponse.json({ profile: { ...profile, email_signatures: signatures } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("sender_profiles")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;

    const profileSignatures = { ...getProfileSignaturesMapFromUser(user) };
    delete profileSignatures[id];
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        profile_signatures: profileSignatures,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete profile" },
      { status: 500 }
    );
  }
}
