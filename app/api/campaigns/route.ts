import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, profileId, listId, subjectPrompt, bodyPrompt, followUps } = await req.json();
    const campaignName = typeof name === "string" ? name.trim() : "";
    const subject = typeof subjectPrompt === "string" ? subjectPrompt.trim() : "";
    const body = typeof bodyPrompt === "string" ? bodyPrompt.trim() : "";

    if (!campaignName || !profileId || !listId || !subject || !body) {
      return NextResponse.json({ error: "Missing required campaign fields" }, { status: 400 });
    }

    const serviceSupabase = getServiceClient();

    const [{ data: profile }, { data: list }, { count: leadCount }] = await Promise.all([
      serviceSupabase
        .from("sender_profiles")
        .select("id")
        .eq("id", profileId)
        .eq("user_id", user.id)
        .single(),
      serviceSupabase
        .from("lead_lists")
        .select("id")
        .eq("id", listId)
        .eq("user_id", user.id)
        .single(),
      serviceSupabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("list_id", listId)
        .eq("status", "new"),
    ]);

    if (!profile || !list) {
      return NextResponse.json({ error: "Invalid sender profile or lead list" }, { status: 400 });
    }

    const { data: campaign, error } = await serviceSupabase
      .from("campaigns")
      .insert({
        user_id: user.id,
        sender_profile_id: profileId,
        lead_list_id: listId,
        name: campaignName,
        subject_prompt: subject,
        body_prompt: body,
        total_leads: leadCount ?? 0,
        status: "draft",
      })
      .select("*, sender_profiles(company_name), lead_lists(name)")
      .single();

    if (error) throw error;

    if (Array.isArray(followUps) && followUps.length) {
      const fuRows = followUps.map((fu: {
        step: number; delay_days: number;
        subject_prompt: string; body_prompt: string;
      }, index: number) => ({
        campaign_id: campaign.id,
        step: index + 2,
        delay_days: Math.max(1, Number(fu.delay_days) || 3),
        subject_prompt: String(fu.subject_prompt ?? "").trim(),
        body_prompt: String(fu.body_prompt ?? "").trim(),
      })).filter((fu) => fu.subject_prompt && fu.body_prompt);

      if (fuRows.length > 0) {
        const { error: followUpError } = await serviceSupabase.from("follow_ups").insert(fuRows);
        if (followUpError) throw followUpError;
      }
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
