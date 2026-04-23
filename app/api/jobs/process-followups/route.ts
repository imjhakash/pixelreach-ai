import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

function verifyCron(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function POST(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createServiceClient();

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, sender_profile_id, lead_list_id")
    .eq("status", "active");

  if (!campaigns || campaigns.length === 0) {
    return NextResponse.json({ scheduled: 0 });
  }

  let scheduled = 0;

  for (const campaign of campaigns) {
    const { data: followUps } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("step");

    if (!followUps || followUps.length === 0) continue;

    const { data: profile } = await supabase
      .from("sender_profiles")
      .select("delay_seconds")
      .eq("id", campaign.sender_profile_id)
      .single();

    const delaySeconds = profile?.delay_seconds ?? 60;

    for (const fu of followUps) {
      const dueDate = new Date(Date.now() - fu.delay_days * 24 * 60 * 60 * 1000);

      const { data: sentAtStep } = await supabase
        .from("email_sends")
        .select("id, lead_id, sent_at")
        .eq("campaign_id", campaign.id)
        .is("follow_up_id", null)
        .eq("status", "sent")
        .lt("sent_at", dueDate.toISOString());

      if (!sentAtStep || sentAtStep.length === 0) continue;

      for (const [i, original] of sentAtStep.entries()) {
        const { count: alreadySent } = await supabase
          .from("email_sends")
          .select("id", { count: "exact", head: true })
          .eq("campaign_id", campaign.id)
          .eq("follow_up_id", fu.id)
          .eq("lead_id", original.lead_id);

        if (alreadySent && alreadySent > 0) continue;

        const { data: replies } = await supabase
          .from("email_sends")
          .select("replied_at")
          .eq("campaign_id", campaign.id)
          .eq("lead_id", original.lead_id)
          .not("replied_at", "is", null);

        if (replies && replies.length > 0) continue;

        const { data: accounts } = await supabase
          .from("email_accounts")
          .select("id, rotation_order")
          .eq("sender_profile_id", campaign.sender_profile_id)
          .eq("is_active", true)
          .order("rotation_order");

        const { data: newSend } = await supabase
          .from("email_sends")
          .insert({
            campaign_id: campaign.id,
            follow_up_id: fu.id,
            lead_id: original.lead_id,
            email_account_id: accounts && accounts.length > 0
              ? accounts[i % accounts.length].id
              : null,
            status: "pending_gen",
          })
          .select("id")
          .single();

        if (newSend) {
          await supabase.from("email_send_queue").insert({
            email_send_id: newSend.id,
            scheduled_at: new Date(Date.now() + i * delaySeconds * 1000).toISOString(),
            status: "pending",
          });
          scheduled++;
        }
      }
    }
  }

  return NextResponse.json({ scheduled });
}
