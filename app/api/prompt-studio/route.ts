import { NextRequest, NextResponse } from "next/server";
import { getServiceClient, getUserFromRequest } from "@/lib/supabase/api-client";
import {
  DEFAULT_BODY_PROMPT,
  DEFAULT_SUBJECT_PROMPT,
  getPromptStudioSettingsFromUser,
  pickPromptSettings,
} from "@/lib/prompt-studio";

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

    const metadataSettings = getPromptStudioSettingsFromUser(user);

    if (error) {
      return NextResponse.json({
        settings: {
          subject_prompt:
            pickPromptSettings(metadataSettings, {
              subject_prompt: DEFAULT_SUBJECT_PROMPT,
              body_prompt: DEFAULT_BODY_PROMPT,
            }).subjectPrompt,
          body_prompt:
            pickPromptSettings(metadataSettings, {
              subject_prompt: DEFAULT_SUBJECT_PROMPT,
              body_prompt: DEFAULT_BODY_PROMPT,
            }).bodyPrompt,
        },
      });
    }

    const settings = pickPromptSettings(data, metadataSettings);

    return NextResponse.json({
      settings: {
        subject_prompt: settings.subjectPrompt,
        body_prompt: settings.bodyPrompt,
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
    const payload = {
      user_id: user.id,
      subject_prompt: subjectPrompt,
      body_prompt: bodyPrompt,
      updated_at: new Date().toISOString(),
    };

    const metadataResult = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...(user.user_metadata ?? {}),
        prompt_studio: {
          subject_prompt: subjectPrompt,
          body_prompt: bodyPrompt,
        },
      },
    });

    if (metadataResult.error) {
      throw metadataResult.error;
    }

    // Mirror to the SQL table when available, but don't fail the save if that table
    // hasn't been created yet in the deployed project.
    const { data: existing } = await supabase
      .from("prompt_studio_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const query = existing?.id
      ? supabase.from("prompt_studio_settings").update(payload).eq("id", existing.id)
      : supabase.from("prompt_studio_settings").insert(payload);

    const { data, error } = await query.select().single();

    if (error) {
      return NextResponse.json({
        settings: {
          subject_prompt: subjectPrompt,
          body_prompt: bodyPrompt,
        },
        persisted_to: "user_metadata",
      });
    }

    return NextResponse.json({ settings: data, persisted_to: "user_metadata_and_table" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save prompt settings" },
      { status: 500 }
    );
  }
}
