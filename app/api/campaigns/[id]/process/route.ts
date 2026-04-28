import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = getServiceClient();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if (campaign.status !== "active") {
    return NextResponse.json({ error: "Campaign must be active to process" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  // Call the single campaign-worker (no HTTP sub-chaining)
  const res = await fetch(`${baseUrl}/api/jobs/campaign-worker`, {
    headers: {
      Authorization: `Bearer ${secret}`,
      "Cache-Control": "no-store",
    },
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({
    generated: data.generated ?? 0,
    sent: data.sent ?? 0,
  });
}
