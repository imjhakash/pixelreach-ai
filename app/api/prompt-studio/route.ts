import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, getUserFromRequest } from "@/lib/supabase/api-client";
import { DEFAULT_BODY_PROMPT, DEFAULT_SUBJECT_PROMPT } from "@/lib/prompt-studio";

export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("prompt_studio_settings")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      settings: data ?? {
        subject_prompt: DEFAULT_SUBJECT_PROMPT,
        body_prompt: DEFAULT_BODY_PROMPT,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load prompt settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const subjectPrompt = String(body.subject_prompt ?? "").trim();
    const bodyPrompt = String(body.body_prompt ?? "").trim();

    if (!subjectPrompt || !bodyPrompt) {
      return NextResponse.json(
        { error: "Subject and body prompts are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("prompt_studio_settings")
      .upsert(
        {
          user_id: user.id,
          subject_prompt: subjectPrompt,
          body_prompt: bodyPrompt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ settings: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save prompt settings" },
      { status: 500 }
    );
  }
}
