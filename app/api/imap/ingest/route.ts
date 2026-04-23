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

  const messageId = in_reply_to ?? (references ?? "").split(" ")[0];
  const trackingId = messageId?.match(/<([^@]+)@/)?.[1];

  if (trackingId) {
    const { data: send } = await supabase
      .from("email_sends")
      .select("id, campaign_id")
      .eq("tracking_id", trackingId)
      .single();

    if (send) {
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
        supabase.rpc("increment_campaign_reply", { campaign_id: send.campaign_id }).maybeSingle(),
      ]);
    }
  }

  const bounceKeywords = ["undeliverable", "delivery failed", "bounce", "failed permanently", "does not exist"];
  const isBounce = bounceKeywords.some((kw) => (subject ?? "").toLowerCase().includes(kw));

  if (isBounce && trackingId) {
    const { data: send } = await supabase
      .from("email_sends")
      .select("id, campaign_id, lead_id")
      .eq("tracking_id", trackingId)
      .single();

    if (send) {
      await Promise.all([
        supabase.from("email_sends").update({ status: "bounced" }).eq("id", send.id),
        supabase.from("leads").update({ status: "bounced" }).eq("id", send.lead_id),
        supabase.from("tracking_events").insert({
          email_send_id: send.id,
          event_type: "bounced",
        }),
        supabase.rpc("increment_campaign_bounce", { campaign_id: send.campaign_id }).maybeSingle(),
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
