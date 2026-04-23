import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, profileId, listId, subjectPrompt, bodyPrompt, followUps } = await req.json();

    const serviceSupabase = getServiceClient();

    const { count: leadCount } = await serviceSupabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("list_id", listId)
      .eq("status", "new");

    const { data: campaign, error } = await serviceSupabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        sender_profile_id: profileId,
        lead_list_id: listId,
        name,
        subject_prompt: subjectPrompt,
        body_prompt: bodyPrompt,
        total_leads: leadCount ?? 0,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw error;

    if (followUps?.length) {
      const fuRows = followUps.map((fu: {
        step: number; delay_days: number;
        subject_prompt: string; body_prompt: string;
      }) => ({
        campaign_id: campaign.id,
        step: fu.step,
        delay_days: fu.delay_days,
        subject_prompt: fu.subject_prompt,
        body_prompt: fu.body_prompt,
      }));
      await serviceSupabase.from("follow_ups").insert(fuRows);
    }

    return NextResponse.json({ campaign });
  } catch (err) {
    console.error("campaigns POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed" },
      { status: 500 }
    );
  }
}
