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

  const headers = {
    Authorization: `Bearer ${secret}`,
    "Cache-Control": "no-store",
  };

  const genRes = await fetch(`${baseUrl}/api/jobs/generate-emails`, { headers });
  const genData = await genRes.json().catch(() => ({}));

  const sendRes = await fetch(`${baseUrl}/api/jobs/process-send-queue`, { headers });
  const sendData = await sendRes.json().catch(() => ({}));

  return NextResponse.json({
    generated: genData.generated ?? 0,
    sent: sendData.sent ?? 0,
  });
}
