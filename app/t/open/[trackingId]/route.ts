import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  try {
    const supabase = await createServiceClient();

    const { data: send } = await supabase
      .from("email_sends")
      .select("id, opened_at, open_count")
      .eq("tracking_id", trackingId)
      .single();

    if (send) {
      const isFirstOpen = !send.opened_at;
      await supabase
        .from("email_sends")
        .update({
          opened_at: send.opened_at ?? new Date().toISOString(),
          open_count: (send.open_count ?? 0) + 1,
        })
        .eq("id", send.id);

      await supabase.from("tracking_events").insert({
        email_send_id: send.id,
        event_type: "opened",
        ip_address: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
        user_agent: req.headers.get("user-agent"),
      });

      if (isFirstOpen) {
        await supabase.rpc("increment_campaign_open", { send_id: send.id }).maybeSingle();
      }
    }
  } catch (err) {
    console.error("tracking open error:", err);
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    },
  });
}
