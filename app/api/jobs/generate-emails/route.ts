import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { generateEmailContent } from "@/lib/prompt-studio";

function verifyCron(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: pendingSends } = await supabase
    .from("email_sends")
    .select("id, tracking_id, campaign_id, lead_id")
    .eq("status", "pending_gen")
    .limit(10);

  if (!pendingSends || pendingSends.length === 0) {
    return NextResponse.json({ generated: 0 });
  }

  let generated = 0;

  for (const send of pendingSends) {
    try {
      const [{ data: campaign }, { data: lead }] = await Promise.all([
        supabase
          .from("campaigns")
          .select("subject_prompt, body_prompt, sender_profiles(*)")
          .eq("id", send.campaign_id)
          .single(),
        supabase
          .from("leads")
          .select("*")
          .eq("id", send.lead_id)
          .single(),
      ]);

      if (!campaign || !lead) continue;

      const profile = campaign.sender_profiles as Record<string, unknown> | null;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pixelreach.ai";
      const result = await generateEmailContent({
        profile: profile as never,
        lead: lead as never,
        subjectPrompt: campaign.subject_prompt,
        bodyPrompt: campaign.body_prompt,
        appUrl,
        tracking: {
          clickUrl: `${appUrl}/t/click/${send.tracking_id}?url=ORIGINAL_URL`,
          openPixelUrl: `${appUrl}/t/open/${send.tracking_id}`,
        },
      });

      if (result?.subject && result?.body_html) {
        await supabase
          .from("email_sends")
          .update({ subject: result.subject, body_html: result.body_html, status: "ready" })
          .eq("id", send.id);
        generated++;
      }
    } catch (err) {
      console.error("generate-emails error for send", send.id, err);
      await supabase
        .from("email_sends")
        .update({ status: "failed", error_message: String(err) })
        .eq("id", send.id);
    }
  }

  return NextResponse.json({ generated });
}
