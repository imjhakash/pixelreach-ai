import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

export const runtime = "nodejs";
export const maxDuration = 60;

const RUNS_PER_CLICK = 3;

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

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (campaign.status !== "active") {
    return NextResponse.json({ error: "Campaign must be active to process" }, { status: 400 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  let totalGenerated = 0;
  let totalSent = 0;

  for (let i = 0; i < RUNS_PER_CLICK; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/jobs/campaign-worker`, {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Cache-Control": "no-store",
        },
      });
      if (!res.ok) break;
      const data = await res.json();
      totalGenerated += data.generated ?? 0;
      totalSent += data.sent ?? 0;
      // If worker had nothing to do, stop early
      if ((data.generated ?? 0) === 0 && (data.sent ?? 0) === 0) break;
    } catch (err) {
      console.error("[process-now] worker call failed:", err);
      break;
    }
  }

  return NextResponse.json({ generated: totalGenerated, sent: totalSent });
}
