import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { account_id, from_address, subject, in_reply_to, references, received_at } = body;

  const supabase = await createServiceClient();

  await supabase.from("imap_ingest_buffer").insert({
    email_account_id: account_id,
    from_address,
    subject,
    in_reply_to,
    references,
    body: body.body ?? null,
    received_at,
    processed: false,
  });

  const trackingSource = [in_reply_to, references, body.body].filter(Boolean).join(" ");
  const trackingId = trackingSource.match(/<([0-9a-f-]{36})@/)?.[1]
    ?? trackingSource.match(/X-Tracking-ID:\s*([0-9a-f-]{36})/i)?.[1];

  const bounceKeywords = [
    "undeliverable",
    "delivery failed",
    "delivery status notification",
    "mail delivery subsystem",
    "returned mail",
    "bounce",
    "failed permanently",
    "recipient address rejected",
    "user unknown",
    "does not exist",
  ];
  const bounceText = `${subject ?? ""} ${body.body ?? ""}`.toLowerCase();
  const isBounce = bounceKeywords.some((kw) => bounceText.includes(kw));

  if (trackingId) {
    const { data: send } = await supabase
      .from("email_sends")
      .select("id, campaign_id, lead_id, replied_at, status")
      .eq("tracking_id", trackingId)
      .single();

    if (send && isBounce && send.status !== "bounced") {
      await Promise.all([
        supabase.from("email_sends").update({ status: "bounced" }).eq("id", send.id),
        supabase.from("leads").update({ status: "bounced" }).eq("id", send.lead_id),
        supabase.from("tracking_events").insert({
          email_send_id: send.id,
          event_type: "bounced",
          metadata: { from: from_address, subject },
        }),
        supabase.rpc("increment_campaign_bounce", { campaign_id: send.campaign_id }).maybeSingle(),
      ]);
    }

    if (send && !isBounce && !send.replied_at) {
      const now = new Date().toISOString();
      await Promise.all([
        supabase
          .from("email_sends")
          .update({ replied_at: now })
          .eq("id", send.id)
          .is("replied_at", null),
        supabase.from("tracking_events").insert({
          email_send_id: send.id,
          event_type: "replied",
          metadata: { from: from_address, subject },
        }),
        supabase.from("leads").update({ status: "replied" }).eq("id", send.lead_id),
        supabase.rpc("increment_campaign_reply", { campaign_id: send.campaign_id }).maybeSingle(),
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
