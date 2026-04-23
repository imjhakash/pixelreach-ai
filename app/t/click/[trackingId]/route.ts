import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;
  const url = req.nextUrl.searchParams.get("url") ?? "/";

  try {
    const supabase = await createServiceClient();

    const { data: send } = await supabase
      .from("email_sends")
      .select("id, clicked_at, click_count")
      .eq("tracking_id", trackingId)
      .single();

    if (send) {
      await supabase
        .from("email_sends")
        .update({
          clicked_at: send.clicked_at ?? new Date().toISOString(),
          click_count: (send.click_count ?? 0) + 1,
        })
        .eq("id", send.id);

      await supabase.from("tracking_events").insert({
        email_send_id: send.id,
        event_type: "clicked",
        metadata: { url },
        ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
      });

      await supabase.rpc("increment_campaign_click", { send_id: send.id }).maybeSingle();
    }
  } catch (err) {
    console.error("tracking click error:", err);
  }

  return NextResponse.redirect(url.startsWith("http") ? url : `https://${url}`);
}
