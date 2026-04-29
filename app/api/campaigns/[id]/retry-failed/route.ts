import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, getServiceClient } from "@/lib/supabase/api-client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = getServiceClient();

  // Verify campaign belongs to user
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const sendId: string | undefined = body.send_id;

  // Fetch failed sends (optionally a single one)
  const failedQuery = supabase
    .from("email_sends")
    .select("id, subject, body_html")
    .eq("campaign_id", id)
    .eq("status", "failed");

  const { data: failedSends } = sendId
    ? await failedQuery.eq("id", sendId)
    : await failedQuery;

  if (!failedSends || failedSends.length === 0) {
    return NextResponse.json({ retried: 0 });
  }

  // Determine reset status: if content exists it just needs re-sending, else re-generate
  const updates = failedSends.map((s) =>
    supabase
      .from("email_sends")
      .update({
        status: s.subject && s.body_html ? "ready" : "pending_gen",
        error_message: null,
      })
      .eq("id", s.id)
  );
  await Promise.all(updates);

  // For each failed send, reset or re-create the queue entry
  for (let i = 0; i < failedSends.length; i++) {
    const s = failedSends[i];
    const scheduledAt = new Date(Date.now() + i * 3000).toISOString();

    const { data: existing } = await supabase
      .from("email_send_queue")
      .select("id")
      .eq("email_send_id", s.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("email_send_queue")
        .update({
          status: "pending",
          scheduled_at: scheduledAt,
          retry_count: 0,
          last_error: null,
          locked_by: null,
          locked_at: null,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("email_send_queue").insert({
        email_send_id: s.id,
        scheduled_at: scheduledAt,
        status: "pending",
        retry_count: 0,
      });
    }
  }

  return NextResponse.json({ retried: failedSends.length });
}
